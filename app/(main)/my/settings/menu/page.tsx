"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, LayoutGrid, Save, RotateCcw, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useNavConfig } from "@/components/providers/nav-config-provider";

export default function UserMenuSettingsPage() {
  const { activeCategories, getActiveItems, userPrefs, setUserPref } = useNavConfig();
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // Prefs are already persisted to localStorage in real-time via setUserPref
    setSaved(true);
    toast.success("메뉴 설정이 저장되었습니다. 다음 방문 시 적용됩니다.");
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    // Clear all user prefs
    try { localStorage.removeItem("npl_user_nav_prefs"); } catch { /* ignore */ }
    toast.success("메뉴 설정이 기본값으로 초기화되었습니다.");
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-[var(--color-surface-sunken)]">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <Link href="/my/settings" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ChevronLeft className="h-4 w-4" /> 내 설정
          </Link>
          <div className="flex items-center gap-3 mb-1">
            <LayoutGrid className="h-6 w-6 text-[var(--color-brand-dark)]" />
            <h1 className="text-xl font-bold text-[var(--color-text-primary)]">내 메뉴 설정</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            내가 자주 사용하는 메뉴를 선택해 상단 네비게이션을 개인화하세요.
            관리자가 비활성화한 메뉴는 설정할 수 없습니다.
          </p>
        </div>

        <div className="space-y-4 mb-6">
          {activeCategories
            .filter(c => c.key !== 'my')
            .map((cat) => {
              const items = getActiveItems(cat.key);
              return (
                <Card key={cat.key} className="bg-[var(--color-surface-elevated)]">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold">{cat.label}</CardTitle>
                      <span className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--color-border-subtle)] text-[var(--color-text-muted)]">
                        {items.filter(i => userPrefs[i.key] !== false).length}/{items.length}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="space-y-2">
                      {items.map((item) => {
                        const isVisible = userPrefs[item.key] !== false;
                        return (
                          <div key={item.key} className="flex items-center justify-between rounded-lg p-2 hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-2 min-w-0">
                              {isVisible
                                ? <Eye className="h-3.5 w-3.5 text-[#2E75B6] shrink-0" />
                                : <EyeOff className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              }
                              <div className="min-w-0">
                                <p className={`text-sm font-medium truncate ${!isVisible ? 'text-muted-foreground line-through' : ''}`}>
                                  {item.label}
                                </p>
                                {item.description && (
                                  <p className="text-[11px] text-muted-foreground truncate">{item.description}</p>
                                )}
                              </div>
                            </div>
                            <Switch
                              checked={isVisible}
                              onCheckedChange={(v) => setUserPref(item.key, v)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          }
        </div>

        <div className="flex gap-3">
          <button onClick={handleReset} className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg border border-[var(--color-border-default)] text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-sunken)] transition-colors">
            <RotateCcw className="h-4 w-4" />
            기본값으로 초기화
          </button>
          <button onClick={handleSave} className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--color-brand-dark)] hover:bg-[var(--color-brand-mid)] text-white text-sm font-medium transition-colors">
            <Save className="h-4 w-4" />
            {saved ? "저장됨 ✓" : "설정 저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
