import { NextPageContext } from 'next'
import Link from 'next/link'

function Error({ statusCode }: { statusCode?: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', color: '#1B3A5C', marginBottom: '0.5rem' }}>
          {statusCode ? `${statusCode} 오류` : '오류가 발생했습니다'}
        </h1>
        <p style={{ color: '#6b7280' }}>
          {statusCode === 404 ? '페이지를 찾을 수 없습니다.' : '서버에서 오류가 발생했습니다.'}
        </p>
        <Link href="/" style={{ color: '#10B981', marginTop: '1rem', display: 'inline-block' }}>
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  )
}

Error.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404
  return { statusCode }
}

export default Error
