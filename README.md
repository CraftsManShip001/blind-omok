# 블라인드 오목 (Blind Gomoku)

> 같은 색. 다른 기억.

모든 돌이 **같은 색**으로 놓이는 온라인 오목. 내가 둔 돌과 상대가 둔 돌을 **기억**하며
5목을 만들고, 게임이 끝나는 순간 모든 돌의 진짜 주인이 색으로 **공개**됩니다.

- 🎲 **랜덤 매칭** — 버튼 한 번으로 상대를 찾아 바로 시작
- 🔗 **방 만들기 / 코드 입장** — 친구와 코드를 공유해 같은 방에서 대국
- 👀 **관전** — 두 명 외에는 관전자, 관전자는 색 공개를 켜고 끌 수 있음
- ⚪ **블라인드** — 진행 중에는 모든 돌이 동일한 중립색 (서버가 소유 정보를 마스킹)
- 🎨 **엔드게임 리빌** — 승부가 나면 돌 색이 물결처럼 펼쳐지는 연출
- 📜 **메모리 레저** — 기보 레일에 마우스를 올리면 해당 수를 판 위에서 되짚어 봄

## 기술 스택

- **Next.js 16** (App Router, Turbopack) + **React 19** — SSR/SEO
- **커스텀 Node.js 서버** (`server.ts`) + **Socket.IO** — 실시간 통신 (동일 프로세스)
- **TypeScript** 전체 적용, **Tailwind CSS v4**
- 게임 상태는 서버 인메모리 (계정/DB 없음, 닉네임만)
- 룰: 자유 룰 (금수 없음, 5목 이상 승리)

## 로컬 실행

```bash
npm install
npm run dev        # http://localhost:3000
```

`npm run dev` 는 `tsx watch` 로 커스텀 서버(`server.ts`)를 띄웁니다. Next.js와 Socket.IO가
같은 HTTP 서버에 붙어 한 포트(3000)에서 동작합니다.

## 테스트

```bash
npx tsx scripts/test-omok.ts          # 오목 엔진 단위 테스트 (11)
npx tsx scripts/test-integration.ts   # 서버 프로토콜 통합 테스트 (32, 서버 실행 중이어야 함)
```

`scripts/bot.ts <방코드>` 로 간단한 상대 봇을 붙여 수동 테스트도 가능합니다.

## 프로덕션 빌드 / 실행

```bash
npm run build      # next build
npm start          # NODE_ENV=production tsx server.ts
```

## 배포

> ⚠️ **Vercel에는 그대로 올라가지 않습니다.** Vercel은 지속 연결(WebSocket)·커스텀 서버를
> 지원하지 않으므로, 단일 프로세스 서버를 그대로 호스팅하는 **Railway / Render / Fly.io /
> Cloud Run** 등을 사용하세요. (포함된 `Dockerfile` 로 어디든 배포 가능)

1. 저장소를 호스팅 플랫폼에 연결하거나 Docker 이미지를 빌드합니다.
2. 환경 변수 설정 (`.env.example` 참고):
   - `NEXT_PUBLIC_SITE_URL` — 실제 도메인 (OG 메타데이터·sitemap·robots 용)
   - `PORT` — 대부분 플랫폼이 자동 주입 (서버가 `process.env.PORT` 사용)
3. 빌드/시작 커맨드: `npm run build` → `npm start` (Docker는 자동).

```bash
# 로컬에서 컨테이너로 확인
docker build -t blind-omok .
docker run -p 3000:3000 -e NEXT_PUBLIC_SITE_URL=http://localhost:3000 blind-omok
```

## 프로젝트 구조

```
server.ts                  커스텀 서버 (Next + Socket.IO 부트스트랩)
lib/
  types.ts                 클라이언트/서버 공유 타입 + Socket.IO 이벤트 계약
  omok.ts                  순수 오목 로직 (착수/승리판정/만원)
  board.ts                 보드 좌표 기하 + 좌표 라벨
  clientId.ts              탭별 신원(sessionStorage) + 닉네임(localStorage)
  server/gameServer.ts     인메모리 방/매칭 매니저 + 블라인드 마스킹 직렬화
components/
  SocketProvider.tsx       소켓 연결·닉네임·토스트·온라인 수 컨텍스트
  Lobby.tsx / OnlineCount  로비 인터랙션
  room/Board.tsx           SVG 오목판 (블라인드 → 리빌 캐스케이드)
  room/MemoryLedger.tsx    기보 레일
  room/SidePanel.tsx       방/플레이어/관전/리빌 토글/재대국
  room/RoomClient.tsx      방 화면 오케스트레이션
app/                       App Router 페이지 + 글로벌 스타일 + 메타데이터
DESIGN.md                  비주얼 디자인 스펙 (MONO · "한 수 차이")
```

## 동작 메모

- **블라인드 보장**: 진행 중 플레이어에게는 돌의 `owner` 가 항상 `null` 로 전송됩니다.
  관전자에게만 `owner` 가 내려가고(색 공개 토글용), 게임이 끝나면 모두에게 공개됩니다.
  → 플레이어가 네트워크 탭을 열어도 진행 중에는 소유 정보를 알 수 없습니다.
- **상대 이탈 처리**: 나가기 버튼은 **즉시** 남은 사람 승리. 탭 닫기/연결 끊김은 **5초**
  유예 후 자동 승리(그 사이 새로고침·일시적 끊김이면 좌석 복귀).
- **재접속**: 새로고침해도 같은 탭이면 좌석을 유지합니다 (clientId = sessionStorage).
  새 탭은 독립 신원이라 자기 게임을 관전으로 띄울 수도 있습니다.
- **인메모리 한계**: 서버를 재시작하면 진행 중인 방은 사라집니다. 멀티 인스턴스로 확장하려면
  방 상태를 Redis 등으로 옮기면 됩니다 (현재 단일 인스턴스 전제).
