<script lang="ts">
  import CircleAlertIcon from "@lucide/svelte/icons/circle-alert";
  import CircleCheckIcon from "@lucide/svelte/icons/circle-check";
  import InfoIcon from "@lucide/svelte/icons/info";
  import XIcon from "@lucide/svelte/icons/x";
  import { Button } from "#lib/components/ui/button/index.ts";
  import { Checkbox } from "#lib/components/ui/checkbox/index.ts";
  import * as Field from "#lib/components/ui/field/index.ts";
  import { Input } from "#lib/components/ui/input/index.ts";
  import * as Marker from "#lib/components/ui/marker/index.ts";
  import { Progress } from "#lib/components/ui/progress/index.ts";
  import * as Select from "#lib/components/ui/select/index.ts";
  import { Spinner } from "#lib/components/ui/spinner/index.ts";
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
  const generateLabel = $derived.by(() => {
    switch (generation.phase) {
      case "idle":
        return "PDF 생성";
      case "collecting":
        return "슬라이드 목록 확인 중…";
      case "rendering":
        return `PDF 생성 중… (${generation.done}/${generation.total})`;
    }
  });

  const disabledSlidesDescription = $derived.by(() => {
    const { includeDisabledSlides, dimDisabledSlides, strikeDisabledSlides } =
      options;

    if (!includeDisabledSlides) {
      return "비활성화된 슬라이드를 생략합니다.";
    }
    if (dimDisabledSlides && strikeDisabledSlides) {
      return "비활성화된 슬라이드를 사선과 함께 흐리게 표시합니다.";
    }
    if (dimDisabledSlides) {
      return "비활성화된 슬라이드를 흐리게 표시합니다.";
    }
    if (strikeDisabledSlides) {
      return "비활성화된 슬라이드에 사선을 표시합니다.";
    }
    return "비활성화된 슬라이드를 다른 슬라이드와 동일하게 표시합니다.";
  });
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
          <Checkbox
            id="pdf-header-pages"
            disabled={true || selectionType === "presentation"}
            bind:checked={options.includeHeaderPages}
          />
          <Field.Label for="pdf-header-pages" class="font-normal line-through">
            재생목록 헤더 페이지 생성
          </Field.Label>
        </Field.Field>

        <Field.Field orientation="horizontal">
          <Checkbox
            id="pdf-groups-labels"
            disabled={generating}
            bind:checked={options.showGroupsAndLabels}
          />
          <Field.Label for="pdf-groups-labels" class="font-normal">
            슬라이드 그룹, 라벨 표시
          </Field.Label>
        </Field.Field>

        <Field.Field orientation="horizontal">
          <Checkbox
            id="pdf-disabled-include"
            aria-describedby="pdf-disabled-description"
            disabled={generating}
            bind:checked={options.includeDisabledSlides}
          />
          <Field.Label for="pdf-disabled-include" class="font-normal">
            비활성화된 슬라이드 포함
          </Field.Label>
        </Field.Field>

        <!--
          하위 항목은 체크박스 폭(size-4)과 간격(gap-2)만큼 들여 써서 상위 레이블과
          맞춘다. 상위 Field.Field 안에 넣으면 하위 체크박스가 비활성화될 때 상위
          체크박스도 함께 흐려지므로 형제로 둔다. 상위를 끄면 하위 항목의 체크
          상태는 그대로 두고 조작만 막는다.
        -->
        <div class="flex flex-col gap-3 pl-6">
          <Field.Field
            orientation="horizontal"
            data-disabled={!options.includeDisabledSlides}
          >
            <Checkbox
              id="pdf-disabled-dim"
              disabled={generating || !options.includeDisabledSlides}
              bind:checked={options.dimDisabledSlides}
            />
            <Field.Label for="pdf-disabled-dim" class="font-normal">
              흐리게
            </Field.Label>
          </Field.Field>

          <Field.Field
            orientation="horizontal"
            data-disabled={!options.includeDisabledSlides}
          >
            <Checkbox
              id="pdf-disabled-strike"
              disabled={generating || !options.includeDisabledSlides}
              bind:checked={options.strikeDisabledSlides}
            />
            <Field.Label for="pdf-disabled-strike" class="font-normal">
              사선 표시
            </Field.Label>
          </Field.Field>

          <Field.Description id="pdf-disabled-description">
            {disabledSlidesDescription}
          </Field.Description>
        </div>
      </Field.Set>
    </Field.Set>

    <div class="flex flex-col gap-3">
      <div class="flex gap-2">
        <Button
          id="pdf-generate"
          class="flex-1"
          disabled={!canGenerate || generating}
          onclick={ongenerate}
        >
          {#if generating}
            <Spinner aria-hidden="true" />
          {/if}
          {generateLabel}
        </Button>
        {#if generating}
          <Button
            variant="outline"
            size="icon"
            title="취소"
            aria-label="PDF 생성 취소"
            onclick={oncancel}
          >
            <XIcon aria-hidden="true" />
          </Button>
        {/if}
      </div>

      {#if generation.phase === "idle"}
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
        <!-- 슬라이드 목록을 확인하는 동안에는 값이 없는(indeterminate) 상태로 둔다. -->
        <Progress
          aria-labelledby="pdf-generate"
          value={generation.phase === "rendering" ? generation.done : null}
          max={generation.phase === "rendering" ? generation.total : 100}
        />
      {/if}
    </div>
  </div>
</section>
