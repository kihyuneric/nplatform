'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Bookmark,
  Trash2,
  Edit3,
  FolderPlus,
  MessageSquare,
  Folder,
} from 'lucide-react';
// scrap-manager uses local state only

interface ScrapItem {
  id: number;
  title: string;
  pubdate: string;
  provider: string;
  memo: string;
  folder: string;
  news_link?: string;
}

function EditFolderDialog({
  currentName,
  onSave,
  children,
}: {
  currentName: string;
  onSave: (newName: string) => void;
  children: React.ReactNode;
}) {
  const [name, setName] = useState(currentName);
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>폴더 이름 수정</AlertDialogTitle>
          <AlertDialogDescription>
            새로운 폴더 이름을 입력하세요.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="폴더 이름"
        />
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (name.trim()) {
                onSave(name.trim());
              }
            }}
          >
            저장
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function ScrapManager() {
  const [folders, setFolders] = useState<string[]>(['기본']);
  const [selectedFolder, setSelectedFolder] = useState('전체');
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [scraps, setScraps] = useState<ScrapItem[]>([
    {
      id: 1,
      title: '[샘플] 서울 아파트 매매가 상승세 지속',
      pubdate: '2025-01-15',
      provider: '한국경제',
      memo: '주요 동향 체크 필요',
      folder: '기본',
    },
    {
      id: 2,
      title: '[샘플] GTX-A 개통 수혜 지역 분석',
      pubdate: '2025-01-14',
      provider: '매일경제',
      memo: '',
      folder: '기본',
    },
  ]);
  const [editingMemo, setEditingMemo] = useState<number | null>(null);
  const [memoText, setMemoText] = useState('');

  const filteredScraps =
    selectedFolder === '전체'
      ? scraps
      : scraps.filter((s) => s.folder === selectedFolder);

  const createFolder = () => {
    const name = newFolderName.trim();
    if (name && !folders.includes(name)) {
      setFolders([...folders, name]);
      setNewFolderName('');
      setShowNewFolder(false);
    }
  };

  const renameFolder = (oldName: string, newName: string) => {
    if (oldName === newName || folders.includes(newName)) return;
    setFolders(folders.map((f) => (f === oldName ? newName : f)));
    setScraps(
      scraps.map((s) =>
        s.folder === oldName ? { ...s, folder: newName } : s
      )
    );
    if (selectedFolder === oldName) {
      setSelectedFolder(newName);
    }
  };

  const deleteFolder = (name: string) => {
    setFolders(folders.filter((f) => f !== name));
    setScraps(
      scraps.map((s) =>
        s.folder === name ? { ...s, folder: '기본' } : s
      )
    );
    if (selectedFolder === name) {
      setSelectedFolder('전체');
    }
  };

  const deleteScrap = (id: number) => {
    setScraps(scraps.filter((s) => s.id !== id));
  };

  const saveMemo = (id: number) => {
    setScraps(
      scraps.map((s) =>
        s.id === id ? { ...s, memo: memoText } : s
      )
    );
    setEditingMemo(null);
    setMemoText('');
  };

  const assignFolder = (id: number, folder: string) => {
    setScraps(
      scraps.map((s) =>
        s.id === id ? { ...s, folder } : s
      )
    );
  };

  return (
    <div className="space-y-4">
      {/* Folder management */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bookmark className="h-5 w-5" />
              스크랩 관리
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowNewFolder(!showNewFolder)}
            >
              <FolderPlus className="h-4 w-4 mr-1" />
              새 폴더
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* New folder input */}
          {showNewFolder && (
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="폴더 이름 입력"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createFolder()}
              />
              <Button size="sm" onClick={createFolder}>
                추가
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowNewFolder(false);
                  setNewFolderName('');
                }}
              >
                취소
              </Button>
            </div>
          )}

          {/* Folder selector */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Button
              size="sm"
              variant={selectedFolder === '전체' ? 'default' : 'outline'}
              onClick={() => setSelectedFolder('전체')}
            >
              <Folder className="h-3 w-3 mr-1" />
              전체
              <Badge variant="secondary" className="ml-1 text-xs">
                {scraps.length}
              </Badge>
            </Button>
            {folders.map((folder) => {
              const count = scraps.filter((s) => s.folder === folder).length;
              return (
                <div key={folder} className="flex items-center gap-0.5">
                  <Button
                    size="sm"
                    variant={
                      selectedFolder === folder ? 'default' : 'outline'
                    }
                    onClick={() => setSelectedFolder(folder)}
                  >
                    <Folder className="h-3 w-3 mr-1" />
                    {folder}
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {count}
                    </Badge>
                  </Button>
                  {folder !== '기본' && (
                    <div className="flex">
                      <EditFolderDialog
                        currentName={folder}
                        onSave={(newName) => renameFolder(folder, newName)}
                      >
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                        >
                          <Edit3 className="h-3 w-3" />
                        </Button>
                      </EditFolderDialog>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-stone-900"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>폴더 삭제</AlertDialogTitle>
                            <AlertDialogDescription>
                              &quot;{folder}&quot; 폴더를 삭제하시겠습니까?
                              폴더 안의 스크랩은 &quot;기본&quot; 폴더로 이동됩니다.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>취소</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteFolder(folder)}
                            >
                              삭제
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Scrapped items */}
      {filteredScraps.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            스크랩한 뉴스가 없습니다.
          </CardContent>
        </Card>
      ) : (
        filteredScraps.map((item) => (
          <Card key={item.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base mb-2 line-clamp-2">
                    {item.title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-3">
                    <span>{item.pubdate}</span>
                    <span>{item.provider}</span>
                    <Badge variant="outline" className="text-xs">
                      <Folder className="h-3 w-3 mr-1" />
                      {item.folder}
                    </Badge>
                  </div>

                  {/* Memo */}
                  {editingMemo === item.id ? (
                    <div className="space-y-2">
                      <Textarea
                        placeholder="메모를 입력하세요"
                        value={memoText}
                        onChange={(e) => setMemoText(e.target.value)}
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => saveMemo(item.id)}
                        >
                          저장
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingMemo(null);
                            setMemoText('');
                          }}
                        >
                          취소
                        </Button>
                      </div>
                    </div>
                  ) : item.memo ? (
                    <div className="flex items-start gap-2 p-2 bg-muted rounded-md">
                      <MessageSquare className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <p className="text-sm flex-1">{item.memo}</p>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => {
                          setEditingMemo(item.id);
                          setMemoText(item.memo);
                        }}
                      >
                        <Edit3 className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs"
                      onClick={() => {
                        setEditingMemo(item.id);
                        setMemoText('');
                      }}
                    >
                      <Edit3 className="h-3 w-3 mr-1" />
                      메모 추가
                    </Button>
                  )}

                  {/* Folder assignment */}
                  <div className="mt-2">
                    <Select
                      value={item.folder}
                      onValueChange={(value) => assignFolder(item.id, value)}
                    >
                      <SelectTrigger className="w-40 h-8 text-xs">
                        <SelectValue placeholder="폴더 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {folders.map((f) => (
                          <SelectItem key={f} value={f}>
                            {f}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Delete scrap button */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-stone-900"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>스크랩 삭제</AlertDialogTitle>
                      <AlertDialogDescription>
                        이 스크랩을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>취소</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteScrap(item.id)}
                      >
                        삭제
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
