# 숲속 연금술사 — 내 게임 주소 만들기 (AI에게 이 파일을 그대로 주세요)

> **사용하는 분께:** 이 파일을 Claude Code, Codex 같은 AI 코딩 도우미에게 주고 “이 파일대로 해줘”라고만 말하면 됩니다.
> AI가 여러분의 GitHub 계정에 게임을 복사하고, 학생에게 나눠 줄 **내 게임 주소**까지 만들어 줍니다.
> AI 없이 직접 하려면 맨 아래 **「직접 하기」** 를 보세요. (약 5분)

---

## AI 도우미에게 드리는 작업 지시

너는 사용자의 GitHub 계정에 「숲속 연금술사」 통합과학 학습 게임을 복사해서, GitHub Pages로 누구나 접속할 수 있는 주소를 만들어 주는 일을 한다. 게임은 정적 HTML·JS·CSS 파일뿐이라 서버·데이터베이스·API 키가 필요 없다.

- 원본 템플릿 저장소: `https://github.com/bsh3408/forest-alchemist-demo` (공개, 템플릿 저장소)
- 완성 결과: `https://<사용자 GitHub 아이디>.github.io/<새 저장소 이름>/`

### 0단계 · 사용자에게 먼저 확인할 것 (한 번에 물어볼 것)

1. 새 저장소 이름 (기본값: `forest-alchemist`, 영문 소문자·숫자·하이픈만)
2. 공개 여부: **공개(public)를 권장한다.** 무료 GitHub 계정은 공개 저장소에서만 Pages 주소가 생긴다는 점을 설명한다.

사용자가 “알아서 해”라고 하면 기본값으로 진행한다.

### 1단계 · 준비 상태 확인

```bash
git --version
gh --version
gh auth status
```

- `gh`가 없거나 로그인이 안 되어 있으면 사용자에게 `gh auth login` 실행을 안내한다(브라우저 로그인은 사용자가 직접 한다). 사용자가 원하지 않으면 **「직접 하기」** 절차를 안내하고 멈춘다.
- 사용자의 비밀번호나 토큰을 대신 입력하거나 파일에 저장하지 않는다.

### 2단계 · 템플릿으로 새 저장소 만들기

```bash
gh repo create <새 저장소 이름> --template bsh3408/forest-alchemist-demo --public
```

같은 이름의 저장소가 이미 있으면 새 이름을 사용자에게 받는다. 기존 저장소를 지우거나 덮어쓰지 않는다.

### 3단계 · GitHub Pages 켜기

템플릿 복사가 끝나기까지 몇 초 걸릴 수 있다. `main` 브랜치가 보일 때까지 10초 간격으로 확인한 뒤 진행한다.

```bash
OWNER=$(gh api user --jq .login)
gh api repos/$OWNER/<새 저장소 이름>/branches/main --jq .name
gh api -X POST repos/$OWNER/<새 저장소 이름>/pages -f "source[branch]=main" -f "source[path]=/"
gh api -X POST repos/$OWNER/<새 저장소 이름>/pages/builds
```

### 4단계 · 배포 완료 확인 (확인 전에 성공이라고 말하지 않는다)

```bash
gh api repos/$OWNER/<새 저장소 이름>/pages/builds/latest --jq .status
curl -s -o /dev/null -w "%{http_code}\n" https://$OWNER.github.io/<새 저장소 이름>/
```

- 상태가 `built`이고 응답 코드가 `200`이 될 때까지 15초 간격으로 최대 5분 기다린다.
- `errored`이거나 5분이 지나도 안 되면, 사용자에게 저장소의 **Settings → Pages** 화면을 열어 보게 하고 거기 표시된 내용을 알려 달라고 한다.

### 5단계 · 사용자에게 알릴 내용

1. 게임 주소 `https://<아이디>.github.io/<새 저장소 이름>/` (클릭할 수 있는 링크로)
2. 학생 안내 방법: 주소를 칠판·QR코드로 나눠 준다. 학생은 로그인 없이 ‘연금술 여정 시작하기’만 누르면 된다.
3. 저장소에 있는 `README.md`에 준비물·진행 순서·주의점이 정리되어 있다는 것
4. 사용자가 원하면 게임 주소의 QR코드 PNG를 만들어 준다(예: Python `qrcode` 패키지).

### 하지 말 것

- 게임 코드(`*.js`, `*.css`, `index.html`, `assets/`)를 임의로 고치지 않는다. 사용자가 요청한 경우에만 수정한다.
- 학생 명단·학번·성적 같은 개인정보를 저장소에 넣지 않는다. 공개 저장소는 누구나 볼 수 있다.
- 원본 저장소(`bsh3408/forest-alchemist-demo`)에 push하거나 이슈·PR을 만들지 않는다.

---

## 직접 하기 (AI 없이, 약 5분)

1. GitHub에 로그인한 뒤 https://github.com/bsh3408/forest-alchemist-demo 에 들어갑니다.
2. 초록색 **Use this template → Create a new repository** 를 누릅니다.
3. 저장소 이름을 적고(예: `forest-alchemist`) **Public** 을 고른 뒤 **Create repository** 를 누릅니다.
4. 새 저장소에서 **Settings → Pages** 로 갑니다.
5. **Branch** 를 `main`, 폴더를 `/ (root)` 로 고르고 **Save** 를 누릅니다.
6. 1~3분 뒤 같은 화면 위쪽에 **Your site is live at …** 주소가 뜹니다. 그 주소가 여러분의 게임 주소입니다.

---

## 알아 두면 좋은 것

- 게임 진행은 학생 브라우저에만 저장됩니다. 서버에 학생 기록이 남지 않습니다.
- 완주 코드(`DEMO-…`)는 체험용이라 공식 평가 증명으로 쓸 수 없습니다.
- 원본 게임이 나중에 개선돼도 여러분의 복사본은 자동으로 바뀌지 않습니다. 새 버전이 필요하면 이 파일로 새 저장소를 다시 만들면 됩니다.
