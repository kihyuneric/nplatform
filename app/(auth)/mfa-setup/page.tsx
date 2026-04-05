'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2, Shield, Copy, Check, ArrowRight } from 'lucide-react'

export default function MFASetupPage() {
  const router = useRouter()
  const [step, setStep] = useState<'qr' | 'verify' | 'backup'>('qr')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [mfaData, setMfaData] = useState<{
    secret: string
    qrCodeUrl: string
    backupCodes: string[]
  } | null>(null)

  const initSetup = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/v1/auth/mfa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'user@example.com' }),
      })
      const json = await res.json()
      if (json.data) {
        setMfaData(json.data)
      }
    } catch {
      setError('MFA 설정 초기화에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError('6자리 인증 코드를 입력해주세요.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/v1/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, secret: mfaData?.secret }),
      })
      const json = await res.json()
      if (json.success) {
        setStep('backup')
      } else {
        setError(json.error?.message || '인증에 실패했습니다.')
      }
    } catch {
      setError('인증 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const copyBackupCodes = () => {
    if (mfaData?.backupCodes) {
      navigator.clipboard.writeText(mfaData.backupCodes.join('\n'))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleComplete = () => {
    router.push('/settings/security')
  }

  // Initialize on first render
  if (!mfaData && !loading) {
    initSetup()
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold" style={{ color: '#1B3A5C' }}>
            2단계 인증 설정
          </CardTitle>
          <CardDescription>
            계정 보안을 강화하기 위해 2단계 인증을 설정합니다.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {step === 'qr' && (
            <>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : mfaData ? (
                <>
                  <div className="flex justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={mfaData.qrCodeUrl}
                      alt="QR Code"
                      className="h-48 w-48 rounded-lg border"
                    />
                  </div>
                  <p className="text-center text-sm text-muted-foreground">
                    Google Authenticator 또는 인증 앱으로 스캔하세요
                  </p>
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-center text-xs text-muted-foreground mb-1">수동 입력 키</p>
                    <p className="text-center font-mono text-sm break-all select-all">
                      {mfaData.secret}
                    </p>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => setStep('verify')}
                  >
                    다음
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </>
              ) : null}
            </>
          )}

          {step === 'verify' && (
            <>
              <p className="text-center text-sm text-muted-foreground">
                인증 앱에서 표시되는 6자리 코드를 입력하세요
              </p>
              <div className="space-y-4">
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6)
                    setCode(val)
                  }}
                  className="text-center text-2xl font-mono tracking-[0.5em]"
                />
                {error && (
                  <p className="text-center text-sm text-destructive">{error}</p>
                )}
                <Button
                  className="w-full"
                  onClick={handleVerify}
                  disabled={loading || code.length !== 6}
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  인증 확인
                </Button>
              </div>
            </>
          )}

          {step === 'backup' && (
            <>
              <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
                <p className="text-sm font-medium text-warning-foreground mb-2">
                  백업 코드를 안전한 곳에 보관하세요
                </p>
                <p className="text-xs text-muted-foreground">
                  인증 앱에 접근할 수 없을 때 백업 코드로 로그인할 수 있습니다. 각 코드는 1회만 사용 가능합니다.
                </p>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <div className="grid grid-cols-2 gap-2">
                  {mfaData?.backupCodes.map((code, i) => (
                    <div key={i} className="font-mono text-sm text-center py-1">
                      {code}
                    </div>
                  ))}
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={copyBackupCodes}
              >
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    복사됨
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    복사
                  </>
                )}
              </Button>
              <Button className="w-full" onClick={handleComplete}>
                설정 완료
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
