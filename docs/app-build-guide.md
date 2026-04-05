# NPLatform 네이티브 앱 빌드 가이드

## 사전 요구사항
- Node.js 18+
- Android Studio (Android)
- Xcode 15+ (iOS, macOS only)

## 1. Capacitor 설치
```bash
npm install @capacitor/core @capacitor/cli
npm install @capacitor/android @capacitor/ios
npm install @capacitor/camera @capacitor/push-notifications @capacitor/haptics
```

## 2. 프로젝트 빌드
```bash
# Next.js 정적 빌드
npm run build
npx next export  # or configure output: 'export' in next.config.mjs

# Capacitor 초기화
npx cap init NPLatform kr.co.nplatform.app --web-dir=out

# 플랫폼 추가
npx cap add android
npx cap add ios
```

## 3. 네이티브 빌드
```bash
# 웹 → 네이티브 동기화
npx cap sync

# Android 빌드
npx cap open android

# iOS 빌드 (macOS only)
npx cap open ios
```

## 4. 개발 모드 (Hot Reload)
next.config.mjs에서 서버 URL 설정 후:
```bash
npm run dev
npx cap run android --livereload --external
```

## 5. 네이티브 기능
- 카메라 OCR: @capacitor/camera로 촬영 → /api/v1/ocr에 업로드
- 푸시 알림: @capacitor/push-notifications + FCM
- 생체 인증: @capacitor/biometrics (향후)
- 햅틱: @capacitor/haptics (버튼 터치 피드백)
