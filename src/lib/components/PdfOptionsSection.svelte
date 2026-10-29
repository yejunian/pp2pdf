<script lang="ts">
  import CircleAlertIcon from "@lucide/svelte/icons/circle-alert";
  import CircleCheckIcon from "@lucide/svelte/icons/circle-check";
  import InfoIcon from "@lucide/svelte/icons/info";
  import { Button } from "#lib/components/ui/button/index.ts";
  import * as Field from "#lib/components/ui/field/index.ts";
  import { Input } from "#lib/components/ui/input/index.ts";
  import * as Marker from "#lib/components/ui/marker/index.ts";
  import { Progress } from "#lib/components/ui/progress/index.ts";
  import * as Select from "#lib/components/ui/select/index.ts";
  import { Spinner } from "#lib/components/ui/spinner/index.ts";
  import { Switch } from "#lib/components/ui/switch/index.ts";
  import * as ToggleGroup from "#lib/components/ui/toggle-group/index.ts";
  import type { GenerationState } from "#lib/types/ui.ts";
  import type { PdfCompression, PdfOptions } from "#lib/utils/pdf.ts";
  import type { PSelection } from "#lib/utils/pp.ts";

  interface Props {
    options: PdfOptions;
    selectionName: string | undefined;
    selectionType: PSelection["type"] | undefined;
    canGenerate: boolean;
    generation: GenerationState;
    ongenerate: () => void;
    oncancel: () => void;
  }

  let {
    options = $bindable(),
    selectionName,
    selectionType,
    canGenerate,
    generation,
    ongenerate,
    oncancel,
  }: Props = $props();

  // `Select`는 문자열 값만 다루므로 슬라이드 크기도 문자열로 바꿔 넘긴다.
  const IMAGE_SIZE_ITEMS = [480, 720, 960, 1280, 1920].map((size) => ({
    value: String(size),
    label: `${size}px`,
  }));
  const COMPRESSIONS: { value: PdfCompression; label: string }[] = [
    { value: "FAST", label: "시간 우선 (큰 용량)" },
    { value: "MEDIUM", label: "균형" },
    { value: "SLOW", label: "용량 우선 (느린 처리)" },
  ];

  const RESULT_ICONS = {
    success: CircleCheckIcon,
    info: InfoIcon,
    error: CircleAlertIcon,
  };

  const generating = $derived(generation.phase !== "idle");
</script>

<section class="flex flex-col gap-4">
  <h2 class="text-lg font-semibold">PDF 생성 옵션</h2>

  <div class="flex flex-col gap-6">
    <Field.Set disabled={generating}>
      <Field.Field>
        <Field.Label for="pdf-name">PDF 이름</Field.Label>
        <Input
          id="pdf-name"
          type="text"
          placeholder={selectionName || "pp2pdf"}
          bind:value={options.name}
        />
        <Field.Description>
          PDF 제목과 파일 이름으로 사용합니다.
        </Field.Description>
      </Field.Field>

      <div class="grid gap-4 sm:grid-cols-2">
        <Field.Field>
          <Field.Label for="pdf-image-size">
            슬라이드 크기 (긴 변의 길이)
          </Field.Label>
          <Select.Root
            type="single"
            items={IMAGE_SIZE_ITEMS}
            disabled={generating}
            bind:value={
              () => String(options.imageSize),
              (value) => {
                if (value) {
                  options.imageSize = Number(value);
                }
              }
            }
          >
            <Select.Trigger id="pdf-image-size" class="w-full">
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Group>
                {#each IMAGE_SIZE_ITEMS as { value, label } (value)}
                  <Select.Item {value} {label}>{label}</Select.Item>
                {/each}
              </Select.Group>
            </Select.Content>
          </Select.Root>
        </Field.Field>

        <Field.Field>
          <Field.Label for="pdf-compression">이미지 압축</Field.Label>
          <Select.Root
            type="single"
            items={COMPRESSIONS}
            disabled={generating}
            bind:value={options.compression}
          >
            <Select.Trigger id="pdf-compression" class="w-full">
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Group>
                {#each COMPRESSIONS as { value, label } (value)}
                  <Select.Item {value} {label}>{label}</Select.Item>
                {/each}
              </Select.Group>
            </Select.Content>
          </Select.Root>
        </Field.Field>
      </div>

      <Field.Field>
        <Field.Label for="pdf-background">
          투명 영역 색상 (Windows 전용)
        </Field.Label>
        <div class="flex items-center gap-2">
          <Input
            id="pdf-background"
            type="color"
            class="w-12 cursor-pointer p-1"
            bind:value={options.backgroundColor}
          />
          <code class="text-sm">{options.backgroundColor}</code>
        </div>
      </Field.Field>

      <Field.Set class="gap-3">
        <Field.Legend variant="label">표시 옵션</Field.Legend>

        <!-- TODO: 구현 전까지 임시로 disabled 처리 -->
        <Field.Field orientation="horizontal">
          <Switch
            id="pdf-header-pages"
            disabled={true || selectionType === "presentation"}
            bind:checked={options.includeHeaderPages}
          />
          <Field.Label for="pdf-header-pages" class="font-normal line-through">
            재생목록 헤더 페이지 생성
          </Field.Label>
        </Field.Field>

        <Field.Field orientation="horizontal">
          <Switch
            id="pdf-groups-labels"
            disabled={generating}
            bind:checked={options.showGroupsAndLabels}
          />
          <Field.Label for="pdf-groups-labels" class="font-normal">
            슬라이드 그룹, 라벨 표시
          </Field.Label>
        </Field.Field>

        <!-- TODO: 구현 전까지 임시로 disabled 처리 -->
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span id="pdf-disabled-slides" class="line-through">
            비활성화된 슬라이드 처리 방법:
          </span>
          <ToggleGroup.Root
            type="single"
            variant="outline"
            size="sm"
            aria-labelledby="pdf-disabled-slides"
            disabled={true}
            bind:value={
              () => options.disabledSlides,
              (value) => {
                // 선택한 항목을 다시 눌러 값이 비면 이전 선택을 유지한다.
                if (value === "dim" || value === "skip") {
                  options.disabledSlides = value;
                }
              }
            }
          >
            <ToggleGroup.Item value="dim">흐리게 표시</ToggleGroup.Item>
            <ToggleGroup.Item value="skip">생략</ToggleGroup.Item>
          </ToggleGroup.Root>
        </div>
      </Field.Set>
    </Field.Set>

    <div class="flex flex-col gap-3">
      {#if generation.phase === "idle"}
        <Button class="w-full" disabled={!canGenerate} onclick={ongenerate}>
          PDF 생성
        </Button>
        {#if !canGenerate}
          <p class="text-center text-sm text-muted-foreground">
            ProPresenter에 연결하고 재생목록이나 프레젠테이션을 선택하세요.
          </p>
        {/if}
        {#if generation.result}
          {@const { type, message } = generation.result}
          {@const ResultIcon = RESULT_ICONS[type]}
          <!-- 메시지가 여러 줄일 수 있으므로 아이콘을 첫 줄에 맞춘다. -->
          <Marker.Root
            role={type === "error" ? "alert" : "status"}
            class={["items-start", type === "error" && "text-destructive"]}
          >
            <Marker.Icon class="mt-0.5"><ResultIcon /></Marker.Icon>
            <Marker.Content class="break-all whitespace-pre-line">
              {message}
            </Marker.Content>
          </Marker.Root>
        {/if}
      {:else}
        <div class="flex flex-col gap-1.5" role="status">
          <div class="flex justify-between text-sm">
            <span id="pdf-progress-label" class="flex items-center gap-1.5">
              <Spinner aria-hidden="true" />
              {generation.phase === "collecting"
                ? "슬라이드 목록 확인 중…"
                : "PDF 생성 중…"}
            </span>
            {#if generation.phase === "rendering"}
              <span class="tabular-nums">
                {generation.done} / {generation.total}
              </span>
            {/if}
          </div>
          <!-- 슬라이드 목록을 확인하는 동안에는 값이 없는(indeterminate) 상태로 둔다. -->
          <Progress
            aria-labelledby="pdf-progress-label"
            value={generation.phase === "rendering" ? generation.done : null}
            max={generation.phase === "rendering" ? generation.total : 100}
          />
        </div>
        <Button variant="destructive" class="w-full" onclick={oncancel}>
          취소
        </Button>
      {/if}
    </div>
  </div>
</section>
