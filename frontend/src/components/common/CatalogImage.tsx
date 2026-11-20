import { useState, type ImgHTMLAttributes, type SyntheticEvent } from "react";

/** Imagen neutra servida desde el propio origen (compatible con la CSP `img-src 'self'`). */
export const PLACEHOLDER_IMAGE = "/placeholder-artwork.svg";

/**
 * `<img>` del catálogo con respaldo: si el archivo no existe o falla la carga,
 * muestra un placeholder en lugar del icono de imagen rota.
 */
export function CatalogImage({ src, onError, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const [failedSrc, setFailedSrc] = useState<string | undefined>(undefined);
  const showPlaceholder = src !== undefined && failedSrc === src;

  function handleError(event: SyntheticEvent<HTMLImageElement, Event>) {
    // Solo se sustituye una vez: si el placeholder también fallara, no hay bucle.
    if (!showPlaceholder) setFailedSrc(src);
    onError?.(event);
  }

  return (
    <img
      {...props}
      src={showPlaceholder ? PLACEHOLDER_IMAGE : src}
      data-placeholder={showPlaceholder ? "true" : undefined}
      onError={handleError}
    />
  );
}
