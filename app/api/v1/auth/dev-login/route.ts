import { NextRequest, NextResponse } from "next/server"

const TEST_ACCOUNTS: Record<string, { password: string; role: string; name: string; userId: string }> = {
  admin: { password: "admin", role: "SUPER_ADMIN", name: "관리자", userId: "00000000-0000-0000-0000-000000000001" },
  seller: { password: "test", role: "SELLER", name: "매도자 테스트", userId: "00000000-0000-0000-0000-000000000002" },
  buyer: { password: "test", role: "BUYER", name: "매수자 테스트", userId: "00000000-0000-0000-0000-000000000003" },
  partner: { password: "test", role: "PARTNER", name: "파트너 테스트", userId: "00000000-0000-0000-0000-000000000004" },
  pro: { password: "test", role: "PROFESSIONAL", name: "전문가 테스트", userId: "00000000-0000-0000-0000-000000000005" },
}

export async function POST(req: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "개발 환경에서만 사용 가능합니다." } },
      { status: 403 }
    )
  }

  try {
    const body = await req.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "아이디와 비밀번호를 입력해주세요." } },
        { status: 400 }
      )
    }

    const account = TEST_ACCOUNTS[username]

    if (!account || account.password !== password) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "잘못된 계정 정보입니다." } },
        { status: 401 }
      )
    }

    const response = NextResponse.json({
      success: true,
      user: {
        id: account.userId,
        username,
        role: account.role,
        name: account.name,
      },
    })

    // Set cookies
    response.cookies.set("dev_user_active", "true", {
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
      httpOnly: false,
      sameSite: "lax",
    })

    response.cookies.set("active_role", account.role, {
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
      httpOnly: false,
      sameSite: "lax",
    })

    response.cookies.set("dev_user_id", account.userId, {
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
      httpOnly: false,
      sameSite: "lax",
    })

    return response
  } catch {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "서버 오류가 발생했습니다." } },
      { status: 500 }
    )
  }
}
