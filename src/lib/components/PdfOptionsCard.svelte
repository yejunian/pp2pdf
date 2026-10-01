<script lang="ts">
  import type { GenerationState } from "$lib/types/ui";
  import type { PdfCompression, PdfOptions } from "$lib/utils/pdf";
  import type { PSelection } from "$lib/utils/pp";

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

  const IMAGE_SIZES = [480, 720, 960, 1280, 1920];
  const COMPRESSIONS: { value: PdfCompression; label: string }[] = [
    { value: "FAST", label: "시간 우선 (큰 용량)" },
    { value: "MEDIUM", label: "균형" },
    { value: "SLOW", label: "용량 우선 (느린 처리)" },
  ];

  const generating = $derived(generation.phase !== "idle");
</script>

<section class="card card-border">
  <div class="card-body gap-4">
    <h2 class="card-title">PDF 생성 옵션</h2>

    <fieldset class="fieldset" disabled={generating}>
      <label class="fieldset-legend" for="pdf-name">PDF 이름</label>
      <input
        id="pdf-name"
        type="text"
        class="input w-full"
        placeholder={selectionName || "pp2pdf"}
        bind:value={options.name}
      />
      <p class="label">PDF 제목과 파일 이름으로 사용합니다.</p>
    </fieldset>

    <div class="grid gap-x-4 sm:grid-cols-2">
      <fieldset class="fieldset" disabled={generating}>
        <label class="fieldset-legend" for="pdf-image-size">
          슬라이드 크기 (긴 변의 길이)
        </label>
        <select
          id="pdf-image-size"
          class="select w-full"
          bind:value={options.imageSize}
        >
          {#each IMAGE_SIZES as size (size)}
            <option value={size}>{size}px</option>
          {/each}
        </select>
      </fieldset>

      <fieldset class="fieldset" disabled={generating}>
        <label class="fieldset-legend" for="pdf-compression">
          이미지 압축
        </label>
        <select
          id="pdf-compression"
          class="select w-full"
          bind:value={options.compression}
        >
          {#each COMPRESSIONS as { value, label } (value)}
            <option {value}>{label}</option>
          {/each}
        </select>
      </fieldset>
    </div>

    <fieldset class="fieldset" disabled={generating}>
      <label class="fieldset-legend" for="pdf-background">
        투명 영역 색상 (Windows 전용)
      </label>
      <div class="flex items-center gap-2">
        <input
          id="pdf-background"
          type="color"
          class="h-10 w-14 cursor-pointer rounded-field border border-base-content/20 bg-base-100 p-1"
          bind:value={options.backgroundColor}
        />
        <code class="text-sm">{options.backgroundColor}</code>
      </div>
    </fieldset>

    <fieldset class="fieldset gap-3" disabled={generating}>
      <legend class="fieldset-legend">표시 옵션</legend>

      <!-- TODO: 구현 전까지 임시로 disabled 처리 -->
      <label class="label text-base-content line-through">
        <input
          type="checkbox"
          class="toggle toggle-primary"
          disabled={true || selectionType === "presentation"}
          bind:checked={options.includeHeaderPages}
        />
        재생목록 헤더 페이지 생성
      </label>

      <label class="label text-base-content">
        <input
          type="checkbox"
          class="toggle toggle-primary"
          bind:checked={options.showGroupsAndLabels}
        />
        슬라이드 그룹, 라벨 표시
      </label>

      <!-- TODO: 구현 전까지 임시로 disabled 처리 -->
      <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span id="pdf-disabled-slides" class="text-base-content line-through">
          비활성화된 슬라이드 처리 방법:
        </span>
        <div
          class="join"
          role="radiogroup"
          aria-labelledby="pdf-disabled-slides"
        >
          <input
            type="radio"
            class="btn join-item btn-sm"
            name="pdf-disabled-slides"
            value="dim"
            aria-label="흐리게 표시"
            bind:group={options.disabledSlides}
            disabled={true}
          />
          <input
            type="radio"
            class="btn join-item btn-sm"
            name="pdf-disabled-slides"
            value="skip"
            aria-label="생략"
            bind:group={options.disabledSlides}
            disabled={true}
          />
        </div>
      </div>
    </fieldset>

    <div class="space-y-3">
      {#if generation.phase === "idle"}
        <button
          type="button"
          class="btn btn-block btn-primary"
          disabled={!canGenerate}
          onclick={ongenerate}
        >
          PDF 생성
        </button>
        {#if !canGenerate}
          <p class="text-center text-sm text-base-content/60">
            ProPresenter에 연결하고 재생목록이나 프레젠테이션을 선택하세요.
          </p>
        {/if}
        {#if generation.result}
          <div
            role="status"
            class={[
              "alert alert-soft text-sm",
              generation.result.type === "success" && "alert-success",
              generation.result.type === "info" && "alert-info",
              generation.result.type === "error" && "alert-error",
            ]}
          >
            <span class="break-all whitespace-pre-line">
              {generation.result.message}
            </span>
          </div>
        {/if}
      {:else}
        <div class="space-y-1" role="status">
          <div class="flex justify-between text-sm">
            <span>
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
          {#if generation.phase === "rendering"}
            <progress
              class="progress w-full progress-primary"
              value={generation.done}
              max={generation.total}
            ></progress>
          {:else}
            <progress class="progress w-full progress-primary"></progress>
          {/if}
        </div>
        <button
          type="button"
          class="btn btn-block btn-outline btn-error"
          onclick={oncancel}
        >
          취소
        </button>
      {/if}
    </div>
  </div>
</section>
