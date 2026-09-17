import { useEffect, useRef, useState, type ReactNode } from 'react';
import { RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react';
import { useLocation } from '@docusaurus/router';

type ViewerImage = {
  alt: string;
  src: string;
};

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

export default function Root({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const [image, setImage] = useState<ViewerImage | null>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (!pathname.includes('/reliable-alm')) {
      return;
    }

    const images = document.querySelectorAll<HTMLImageElement>('.theme-doc-markdown img');

    images.forEach((currentImage) => {
      if (!currentImage.alt || currentImage.closest('[data-disable-image-zoom]')) {
        return;
      }

      currentImage.dataset.imageZoomable = 'true';

      const parentLink = currentImage.closest<HTMLAnchorElement>('a');
      if (parentLink) {
        parentLink.dataset.imageZoomTrigger = 'true';
        parentLink.setAttribute('aria-label', `Open image viewer: ${currentImage.alt}`);
      } else {
        currentImage.setAttribute('role', 'button');
        currentImage.setAttribute('tabindex', '0');
        currentImage.setAttribute('aria-label', `Open image viewer: ${currentImage.alt}`);
      }
    });

    const openImage = (currentImage: HTMLImageElement) => {
      triggerRef.current =
        currentImage.closest<HTMLAnchorElement>('a[data-image-zoom-trigger="true"]') ??
        currentImage;
      setZoom(1);
      setImage({
        alt: currentImage.alt,
        src: currentImage.currentSrc || currentImage.src,
      });
    };

    const handleClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) {
        return;
      }

      const currentImage =
        event.target instanceof HTMLImageElement &&
        event.target.dataset.imageZoomable === 'true'
          ? event.target
          : event.target
              .closest<HTMLAnchorElement>('a[data-image-zoom-trigger="true"]')
              ?.querySelector<HTMLImageElement>('img[data-image-zoomable="true"]');

      if (!currentImage) {
        return;
      }

      event.preventDefault();
      openImage(currentImage);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;

      if (
        target instanceof HTMLImageElement &&
        target.dataset.imageZoomable === 'true' &&
        (event.key === 'Enter' || event.key === ' ')
      ) {
        event.preventDefault();
        openImage(target);
        return;
      }

      if (
        target instanceof HTMLAnchorElement &&
        target.dataset.imageZoomTrigger === 'true' &&
        event.key === ' '
      ) {
        const linkedImage = target.querySelector<HTMLImageElement>('img[data-image-zoomable="true"]');
        if (linkedImage) {
          event.preventDefault();
          openImage(linkedImage);
        }
      }
    };

    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [pathname]);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (image && dialog && !dialog.open) {
      dialog.showModal();
      closeButtonRef.current?.focus();
    }
  }, [image]);

  const closeDialog = () => {
    dialogRef.current?.close();
  };

  const adjustZoom = (amount: number) => {
    setZoom((currentZoom) =>
      Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, currentZoom + amount)),
    );
  };

  return (
    <>
      {children}
      <dialog
        ref={dialogRef}
        className="imageZoomDialog"
        aria-labelledby="imageZoomDialogTitle"
        onClose={() => {
          setImage(null);
          setZoom(1);
          triggerRef.current?.focus();
        }}
        onClick={(event) => {
          const dialog = event.currentTarget;
          const bounds = dialog.getBoundingClientRect();
          const isOutside =
            event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom;

          if (isOutside) {
            closeDialog();
          }
        }}
      >
        {image && (
          <div className="imageZoomDialog__content">
            <header className="imageZoomDialog__toolbar">
              <h2 id="imageZoomDialogTitle">{image.alt}</h2>
              <div className="imageZoomDialog__controls">
                <button
                  type="button"
                  className="button button--secondary button--sm"
                  onClick={() => adjustZoom(-ZOOM_STEP)}
                  disabled={zoom <= MIN_ZOOM}
                  aria-label="Zoom out"
                >
                  <ZoomOut aria-hidden="true" />
                </button>
                <output aria-live="polite" aria-label="Current zoom">
                  {Math.round(zoom * 100)}%
                </output>
                <button
                  type="button"
                  className="button button--secondary button--sm"
                  onClick={() => adjustZoom(ZOOM_STEP)}
                  disabled={zoom >= MAX_ZOOM}
                  aria-label="Zoom in"
                >
                  <ZoomIn aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="button button--secondary button--sm"
                  onClick={() => setZoom(1)}
                  disabled={zoom === 1}
                  aria-label="Reset zoom"
                >
                  <RotateCcw aria-hidden="true" />
                </button>
                <button
                  ref={closeButtonRef}
                  type="button"
                  className="button button--primary button--sm"
                  onClick={closeDialog}
                  aria-label="Close image viewer"
                >
                  <X aria-hidden="true" />
                </button>
              </div>
            </header>
            <div className="imageZoomDialog__viewport">
              <img
                src={image.src}
                alt={image.alt}
                style={{ width: `${zoom * 100}%` }}
                draggable="false"
              />
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
