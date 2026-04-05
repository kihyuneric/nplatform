import {
  insertYoutubeConceptMappings,
  getConceptsByDomain,
  updateYoutubeEnhanced,
  upsertLectureAnalysis,
} from '@/lib/ontology-db'
import {
  analyzeTranscript,
  analyzeTranscriptEnhanced,
  parseTimestampedTranscript,
  analyzeWithTimestamps,
  type ConceptInfo,
} from '@/lib/transcript-analyzer'
import { supabase } from '@/lib/ontology-db'

export interface AnalysisPipelineResult {
  youtube_id: number
  mapped_concepts_count: number
  analysis: {
    total_chunks: number
    analyzed_at: string
    mappings: Array<{
      concept_id: number
      concept_name: string
      relevance: number
      reason: string
      matched_keywords: string[]
    }>
    lecture_type: string
    lecture_type_scores: Record<string, number>
    structure: any[]
    case_references: any[]
    hooking_ratio: number
    information_ratio: number
    case_ratio: number
    cta_ratio: number
  }
}

/**
 * Run the full analysis pipeline on a transcript for a given youtube_id.
 * Handles: keyword analysis, timestamp analysis, enhanced analysis,
 * mapping insertion, youtube enhanced columns, and lecture analysis record.
 *
 * Does NOT call recalculateAllImportance — caller should do that once after batch.
 */
export async function runAnalysisPipeline(
  youtubeId: number,
  transcript: string,
  channelName: string,
  options?: { deletePreviousMappings?: boolean }
): Promise<AnalysisPipelineResult> {
  // Delete previous mappings if reanalyzing
  if (options?.deletePreviousMappings) {
    await supabase
      .from('ont_youtube_concept')
      .delete()
      .eq('youtube_id', youtubeId)
  }

  // Load all concepts
  const allConcepts = await getConceptsByDomain()
  const conceptInfos: ConceptInfo[] = (allConcepts || []).map((c: any) => ({
    concept_id: c.concept_id,
    name: c.name,
    keywords: c.keywords || [],
    description: c.description,
    level: c.level,
    domain_id: c.domain_id,
  }))

  // Keyword analysis
  const analysisResult = analyzeTranscript(transcript, conceptInfos)

  // Timestamp analysis
  const segments = parseTimestampedTranscript(transcript)
  let timestampMappings: any[] = []
  if (segments.length > 3) {
    timestampMappings = analyzeWithTimestamps(segments, conceptInfos)
  }

  // Merge mappings
  const finalMappings = analysisResult.mappings.map((m) => {
    const tsMapping = timestampMappings.find((tm) => tm.concept_id === m.concept_id)
    return {
      youtube_id: youtubeId,
      concept_id: m.concept_id,
      relevance: m.relevance,
      timestamp_start: tsMapping?.timestamp_start || null,
      timestamp_end: tsMapping?.timestamp_end || null,
    }
  })

  // Insert mappings
  if (finalMappings.length > 0) {
    await insertYoutubeConceptMappings(finalMappings)
  }

  // Enhanced analysis
  const enhanced = analyzeTranscriptEnhanced(transcript, conceptInfos)

  // Update youtube enhanced columns
  await updateYoutubeEnhanced(youtubeId, {
    lecture_type: enhanced.lecture_type,
    structure_segments: enhanced.structure,
    case_references: enhanced.case_references,
    expert_name: channelName,
  })

  // Save lecture analysis
  await upsertLectureAnalysis({
    youtube_id: youtubeId,
    lecture_type: enhanced.lecture_type,
    lecture_type_scores: enhanced.lecture_type_scores,
    structure: enhanced.structure,
    case_references: enhanced.case_references,
    case_count: enhanced.case_references.length,
    expert_name: channelName,
    total_segments: enhanced.structure.length,
    hooking_ratio: enhanced.hooking_ratio,
    information_ratio: enhanced.information_ratio,
    case_ratio: enhanced.case_ratio,
    cta_ratio: enhanced.cta_ratio,
  })

  return {
    youtube_id: youtubeId,
    mapped_concepts_count: finalMappings.length,
    analysis: {
      total_chunks: analysisResult.total_chunks,
      analyzed_at: analysisResult.analyzed_at,
      mappings: analysisResult.mappings.map((m) => ({
        concept_id: m.concept_id,
        concept_name: conceptInfos.find((c) => c.concept_id === m.concept_id)?.name || '',
        relevance: m.relevance,
        reason: m.reason,
        matched_keywords: m.matched_keywords,
      })),
      lecture_type: enhanced.lecture_type,
      lecture_type_scores: enhanced.lecture_type_scores,
      structure: enhanced.structure,
      case_references: enhanced.case_references,
      hooking_ratio: enhanced.hooking_ratio,
      information_ratio: enhanced.information_ratio,
      case_ratio: enhanced.case_ratio,
      cta_ratio: enhanced.cta_ratio,
    },
  }
}
