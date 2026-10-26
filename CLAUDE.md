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

테스트 스위트는 없다. 하지 못한 검증은 답변에 명시한다. 임시 스크립트와 결과물은 `/tmp`에 두고 끝나면 지운다.

1. `pnpm exec prettier --write <파일>` → `pnpm check` → `pnpm lint`(prettier만 검사하며, Markdown도 대상이다)
2. PDF 레이아웃은 Node 스크립트에서 `node_modules/jspdf/dist/jspdf.node.js`로 같은 호출을 재현한다. 결과는 `sips -s format png`로 PNG로 바꿔 눈으로 확인한다. 여러 쪽 PDF의 특정 쪽은 Swift PDFKit 스크립트(`swiftc`)로 렌더링한다(`pdftoppm`과 `mutool`은 없다).
3. 브라우저 동작은 `pnpm exec vite dev`로 앱을 띄우고, 헤드리스 브라우저로 UI를 조작해 PDF를 만들어 확인한다.
   - Chrome: `--headless=new --remote-debugging-port`로 띄워 CDP로 조작하고, `Page.setDownloadBehavior`로 PDF를 `/tmp`에 받는다.
   - Firefox: `--headless --remote-debugging-port`로 띄워 WebDriver BiDi로 조작한다.
   - Safari 엔진: Swift로 만든 `WKWebView` 실행기로 확인한다. Safari 앱 자체는 확인하지 못한다.
   - Firefox와 WebKit은 다운로드 폴더에 파일이 생기지 않도록, jsPDF를 불러오기 전에 `window.saveAs`를 바꿔 PDF를 가로챈다.
   - 끝나면 임시 프로필로 띄운 브라우저 프로세스가 남지 않았는지 확인한다.
4. ProPresenter 응답 형식은 추측하지 말고, 서버에 읽기 전용 GET을 보내 확인한다.
   - Mac: `http://localhost:50001`(ProPresenter 21.4)
   - Windows: 사용자가 알려 주는 LAN 주소의 50001 포트(ProPresenter 21.4.2). 재부팅하면 IP가 바뀔 수 있다. LAN 요청은 샌드박스 밖에서 보내야 한다.
   - Windows 섬네일에 큰 `quality`를 요청하지 않는다. 가장 크게 렌더링한 이미지가 캐시에 남아, ProPresenter를 다시 시작할 때까지 같은 슬라이드의 응답이 커진다.
5. 처리 시간을 비교할 때는 ProPresenter의 렌더링 캐시를 고려한다. 모든 방식을 캐시가 데워진 상태에서 재거나, 요청한 적 없는 슬라이드에 방식을 번갈아 배정한다.

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

## 슬라이드 이미지 (`src/lib/utils/pdf.ts`의 `fetchSlideImage`)

- 사용자가 정한 규칙이므로 되돌리지 않는다.
  - 페이지마다 섬네일을 슬라이드 크기(`imageSize`)의 PNG로만 받는다. 받은 PNG와, 그 뒤에 배경색을 깔아 JPEG로 변환한 것 중 하나를 넣는다.
  - PNG 크기의 80%가 JPEG 크기의 100%보다 크지 않으면 PNG를 넣는다. 크기가 비슷하면 무손실인 PNG가 선택되게 하기 위해서다. 배율은 정수 백분율(`PNG_SIZE_PERCENT` = 80)로 두고 `PNG 크기 × 80 ≤ JPEG 크기 × 100`으로 비교한다.
  - JPEG 변환 품질(`JPEG_QUALITY`)은 0.9다. 검토·공유용 PDF 기준으로, 0.92와 확대해도 구분되지 않으면서 JPEG가 약 6% 작다. 0.9 미만은 Firefox가 크로마 서브샘플링을 켜서 작은 색 글자가 흐려지고, 0.85부터는 확대하면 글자 주변에 블록 잡티가 보인다. Safari는 0.85~0.92의 결과가 거의 같다.
  - 예전에는 ProPresenter의 JPEG 섬네일도 받아 PNG와 크기를 비교했다. PDF 크기 차이는 5% 이내인데 섬네일 수신이 느려서(Mac 819쪽 기준 약 3분의 1) 바꿨다.
- 받은 섬네일의 긴 변이 `imageSize`보다 크면(Windows 재생목록 섬네일) 줄인 뒤, 브라우저에서 PNG와 JPEG로 각각 인코딩해 비교한다.
  - 줄일 때는 `createImageBitmap`의 `resizeQuality: "high"`를 쓴다. `drawImage`로 줄이면 Firefox와 Safari에서 `imageSmoothingQuality`와 관계없이 글자 가장자리가 거칠어진다.
- 섬네일은 `colorSpaceConversion: "none"`으로 디코딩한다. jsPDF가 PNG의 색 프로필을 무시하므로, 두 포맷으로 넣은 페이지의 색을 맞추기 위해서다.
- 이미지 압축 수준(`compression`)은 PNG로 넣는 페이지에만 적용된다. jsPDF는 JPEG를 다시 압축하지 않고 그대로 넣는다.
- jsPDF 문서 옵션 `compress: true`를 켠다. 페이지 내용과 폰트 스트림만 Flate로 압축되고 이미지 스트림은 다시 압축되지 않으며, PDF마다 약 0.16~0.21MB 줄어든다.
- PNG에 투명 픽셀이 있으면 jsPDF가 SMask를 붙인다. 그래서 이미지보다 배경색 사각형을 먼저 그린다.

## ProPresenter API 메모

- 앱 번들의 `Contents/MacOS/ProPresenter Helper (Network)`에 OpenAPI 명세가 들어 있다(`strings`로 읽는다).
- 요청의 `Origin`을 그대로 `access-control-allow-origin`에 넣어 응답한다.
- 섬네일
  - `thumbnail_type`은 `jpeg` 또는 `png`이다. 생략하면 `jpeg`와 바이트까지 같은 JPEG를 준다.
  - 명세상 `quality`는 긴 변의 픽셀 수다.
  - Mac(21.4): 재생목록·프레젠테이션 경로 모두 명세대로 요청한 크기를 준다. Retina 배율의 영향이 없고, 캐시 때문에 더 크게 오는 일도 없다.
  - Mac PNG는 RGBA지만 투명 픽셀이 없다(빈 슬라이드의 투명 영역은 체크무늬로 그려 준다). 그래서 "투명 영역 색상 (Windows 전용)" 표기가 맞다. JPEG는 Apple ImageIO 품질 0.75(4:2:0)다.
  - Windows(21.4.2): 프레젠테이션 경로는 명세대로다. 재생목록 경로는 `quality`를 짧은 변 길이로 보고 디스플레이 배율을 곱한다(960 요청 → 100%면 1706×960, 200%면 3412×1920). 또 내용이 같은 슬라이드끼리 캐시를 공유해, 지금까지 가장 크게 렌더링한 이미지를 돌려준다.
    - 세로 슬라이드에서 `quality`가 짧은 변 기준인지 세로 길이 기준인지는 확인하지 않았다.
  - Windows PNG는 투명 영역이 있는 RGBA(straight alpha)이고, JPEG는 IJG 표준 테이블 품질 90이다.
  - Mac은 슬라이드를 처음 렌더링할 때만 약 50ms가 더 걸리고, 이후에는 포맷·크기와 관계없이 캐시를 쓴다. PNG와 JPEG를 동시에 요청해도 겹쳐 처리하지 못한다. Windows는 이런 차이가 거의 없다.
- 라이브러리 UUID는 ProPresenter를 다시 시작하면 바뀐다(재생목록 UUID는 그대로다).
- 그룹 색상 `PColor`는 0~1 실수이므로 ×255로 변환한다(Windows 응답으로 확인). 색이 없는 그룹은 `null`로 온다.
- macOS에서는 이름이 NFD로 올 수 있으므로 `normalize("NFC")` 한 뒤 비교하고 출력한다.
