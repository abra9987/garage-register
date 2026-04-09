---
phase: 05-pdf-preview-on-upload
reviewed: 2026-04-09T00:00:00Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - src/components/upload/upload-pdf-preview.tsx
  - src/components/upload/drop-zone.tsx
findings:
  critical: 0
  warning: 0
  info: 3
  total: 3
status: issues_found
---

# Phase 5: Code Review Report

**Reviewed:** 2026-04-09
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found (3 info-level items, no bugs or security issues)

## Summary

Both files implement the PDF preview feature cleanly. The component split is well-reasoned: `UploadPdfPreview` owns the react-pdf rendering and Object URL lifecycle; `DropZone` owns drop-zone state, dynamic import (SSR=false), and fallback UX. The Object URL is correctly revoked on cleanup. Resize-based width measurement is properly disconnected. Dynamic import pattern for react-pdf is correct for Turbopack/Next.js.

No bugs, no security issues, no logic errors. Three cosmetic/UX info items are noted below.

## Info

### IN-01: Initial render uses react-pdf default width before ResizeObserver fires

**File:** `src/components/upload/upload-pdf-preview.tsx:82`
**Issue:** `containerWidth` initializes to `0`. On first render, `width={containerWidth > 0 ? containerWidth : undefined}` passes `undefined`, so react-pdf renders the page at its internal default width (~612px). The ResizeObserver fires asynchronously after mount and triggers a re-render at the correct container width — causing a brief layout shift/flash.
**Fix:** Initialize `containerWidth` from the ref's `offsetWidth` on first effect run, before the observer fires:
```ts
useEffect(() => {
  const el = containerRef.current;
  if (!el) return;

  // Set initial width synchronously before observer fires
  setContainerWidth(el.offsetWidth);

  const observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      setContainerWidth(entry.contentRect.width);
    }
  });

  observer.observe(el);
  return () => observer.disconnect();
}, []);
```

---

### IN-02: Multiple toasts can fire for a single file rejection

**File:** `src/components/upload/drop-zone.tsx:70-82`
**Issue:** `handleRejection` iterates over all errors for each rejected file. A file that simultaneously fails two checks (unlikely with current config, but possible if `maxSize` and `file-invalid-type` both trigger on a multi-file drop with mixed types) will fire two separate `toast.error` calls in the same handler invocation. In practice with `maxFiles: 1` and `multiple: false` this is low-risk, but the loop structure allows duplicate or stacked toasts.
**Fix:** Break after the first error to show one toast per rejection, or collect all messages and show a single combined toast:
```ts
const handleRejection = useCallback((rejections: FileRejection[]) => {
  for (const rejection of rejections) {
    const error = rejection.errors[0]; // show first error only
    if (error.code === "file-invalid-type") {
      toast.error("Only PDF files are accepted", { duration: 5000 });
    } else if (error.code === "file-too-large") {
      toast.error("File is too large. Maximum size is 10 MB.", { duration: 5000 });
    }
    break; // one toast total — single file drop zone
  }
}, []);
```

---

### IN-03: `text-center` has no visible effect on truncated filename text

**File:** `src/components/upload/drop-zone.tsx:131`
**Issue:** The filename paragraph uses `text-center truncate max-w-full`. `truncate` sets `white-space: nowrap` and clips overflow — but `text-align: center` only centers text that is shorter than the container. When the filename is long enough to be truncated, the text renders left-aligned (the browser starts the text from the left edge and clips the right). The centering intent is not achieved for long filenames.
**Fix:** If centering short filenames is desired and clipping long ones is acceptable, the current code is fine as a compromise. If consistent centering matters, consider `text-ellipsis` with a fixed max-width and `mx-auto`, or simply drop `text-center` since truncated text reads more naturally from the left:
```tsx
<p className="text-sm font-normal truncate max-w-full">
  {file.name} ({formatFileSize(file.size)})
</p>
```

---

_Reviewed: 2026-04-09_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
