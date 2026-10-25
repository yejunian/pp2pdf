# CLAUDE.md

ProPresenter의 재생목록 또는 프레젠테이션을 화면 표시용 PDF로 변환하는 SvelteKit 앱이다(Svelte 5 runes, DaisyUI, jsPDF, pnpm).

## 작업 원칙

- 답변, 코드 주석, 커밋 메시지, UI 문구는 모두 한국어로 쓴다.
- 사용자가 턴 사이에 코드를 직접 고치거나 스테이징하기도 한다. 작업을 시작할 때와 커밋하기 전에 `git branch --show-current`, `git status --short`, `git diff`를 확인한다.
  - 디스크의 현재 내용을 사용자 의도로 받아들인다. 잘못돼 보이면 되돌리지 말고 알린다.
  - "직접 수정하면서 누락된 부분을 바로잡아라"라는 요청을 받으면, 바뀐 규칙을 설명하는 문서 주석·상수 주석이 낡지 않았는지 grep으로 확인한다.
- 명세에 없는 값을 임의로 정했으면 답변에서 밝힌다.

## 커밋

- 형식: `<gitmoji> <type>: <한국어 요약>`. 필요하면 빈 줄 뒤에 `- ` 글머리표 본문을 붙인다.
  - 예: `✨ feat`, `🐛 fix`, `♻️ refactor`, `💄 style`, `💬 chore`, `🔧 config`, `📦️ deps`
- 커밋은 요청할 때만 한다. 브랜치는 사용자 지시를 따르고(새 브랜치는 `feature/<kebab-case>`), 푸시와 병합은 요청이 없으면 하지 않는다.
- 사용자가 직접 스테이징해 둔 내용이 있는데 이에 대한 내용을 명시하지 않았다면, 커밋을 보류하고 사용자에게 어떻게 진행할지 질문한다.

## 검증

테스트 스위트는 없다. 하지 못한 검증(예: 브라우저에서 앱으로 PDF 직접 생성)은 답변에 명시한다.

1. `pnpm exec prettier --write <파일>` → `pnpm check` → `pnpm lint`(prettier만 검사하며, Markdown도 대상이다)
2. PDF 레이아웃은 `/tmp`에 Node 스크립트를 만들어 `node_modules/jspdf/dist/jspdf.node.js`로 같은 호출을 재현한다. 결과를 `sips -s format png`로 PNG로 바꿔 눈으로 확인하고, 끝나면 임시 파일을 지운다(`pdftoppm`과 `mutool`은 없다).
3. ProPresenter 응답 형식은 추측하지 말고, 로컬 서버 `http://localhost:50001`(macOS, ProPresenter 21.4)에 읽기 전용 GET을 보내 확인한다.

## PDF 레이아웃 (`src/lib/utils/pdf.ts`의 `saveSlidesAsPdf`)

- 페이지 구성: 위쪽 왼쪽에 텍스트 줄, 오른쪽 위에 페이지 번호를 두고, 그 아래에 그룹 색상 테두리(두께 padding)로 감싼 슬라이드 이미지를 둔다. 슬라이드 1px을 1pt로 넣는다.
- 위쪽 텍스트는 0~2줄이다.
  - 재생목록 입력이면 첫 줄에 재생목록 항목 이름을 넣는다.
  - 그룹·라벨 표시가 켜져 있으면 `[그룹] 라벨` 줄을 넣는다.
  - 프레젠테이션 입력은 최대 1줄이다.
- 페이지 번호는 현재 프레젠테이션 기준이다. 텍스트 줄이 없으면 슬라이드 위에 겹치므로 검은색 채우기에 흰색 외곽선을 넣는다.
- 첫 줄은 페이지 번호를 침범하지 않게 하고, 줄 바꿈 없이 `…`로 줄인다. 폰트는 `Freesentation-6SemiBold.ttf`이다.
- 사용자가 원래 명세에서 바꾼 규칙이므로 되돌리지 않는다.
  - padding은 `ceil(slideWidth / 160)`을 짝수로 올림한 값이다.
  - 둘째 줄의 글자 크기와 줄 높이는 첫 줄의 80%이다. 줄 높이만 소수점을 올림한다.
  - 부동소수점 오차를 피하려고 배율은 정수 백분율(`LINE_SCALE_PERCENTS`)로 두고 `(값 * percent) / 100` 순서로 계산한다.
- 재생목록 헤더 페이지와 비활성 슬라이드 처리는 아직 구현하지 않았고, UI에서 임시로 비활성화해 두었다.

## ProPresenter API 메모

- 섬네일의 Mac 기본 응답은 JPEG이다. `thumbnail_type=png`를 붙이면 PNG(RGBA)를 준다. `quality`는 긴 변의 픽셀 수다.
- 그룹 색상 `PColor`는 0~1 실수라고 가정해 ×255로 변환한다. 실제 응답으로는 검증하지 않았다.
- macOS에서는 이름이 NFD로 올 수 있으므로 `normalize("NFC")` 한 뒤 비교하고 출력한다.

## 보류 중인 작업: 섬네일 이미지 포맷

- 문제: "이미지 압축" 옵션을 바꿔도 PDF 크기가 그대로다.
- 원인: jsPDF는 JPEG에 `compression`을 적용하지 않고 PNG에만 적용한다.
- PNG로 요청하는 수정을 `feature/png-thumbnails` 브랜치에 커밋해 두었다. main에는 병합하지 않았다.
- 사용자가 나중에 처리하기로 했으므로, 요청 없이 병합하거나 main에 같은 수정을 넣지 않는다.
- 결정에 참고할 측정값(960px 섬네일)
  - 섬네일 46장 중 43장은 PNG가 더 작았다. PNG/JPEG 크기 비율은 중앙값 0.25, 최악 8.6배(사진 배경)였다.
  - 10페이지 PDF는 JPEG가 압축 수준과 무관하게 1.13MB였다. PNG는 FAST 280KB, MEDIUM 279KB, SLOW 194KB였다.
  - PNG는 재압축 때문에 10장에 0.7~1초가 더 걸린다.
- 함께 검토할 점
  - "투명 영역 색상 (Windows 전용)" 표기가 맞는지(Mac의 PNG도 RGBA다).
  - jsPDF 문서 옵션 `compress: true`를 켤지. 켜면 1페이지 기준 362KB가 191KB로 줄었다.
