import { useEffect, useState } from 'react';
import styled from '@emotion/styled';
import { getCachedSize, measureImage, type ImageSize } from '../data/imageSize';

const MAX_WIDTH = 320;
const MAX_HEIGHT = 320;
const FALLBACK: ImageSize = { width: MAX_WIDTH, height: 240 };

const Frame = styled.div`
  position: relative;
  margin-top: 6px;
  overflow: hidden;
  border-radius: 8px;
  background: #e6e6ef;

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

/** 後端只給連結，所以顯示尺寸由量到的原始比例縮放而來。 */
function fitBox(size: ImageSize | null): ImageSize {
  if (!size || size.width <= 0 || size.height <= 0) return FALLBACK;
  const scale = Math.min(MAX_WIDTH / size.width, MAX_HEIGHT / size.height, 1);
  return {
    width: Math.round(size.width * scale),
    height: Math.round(size.height * scale),
  };
}

interface Props {
  url: string;
}

export function MessageImage({ url }: Props) {
  const [size, setSize] = useState(() => getCachedSize(url));

  useEffect(() => {
    const cached = getCachedSize(url);
    if (cached) {
      setSize(cached);
      return;
    }

    let alive = true;
    void measureImage(url).then((measured) => {
      if (alive && measured) setSize(measured);
    });
    return () => {
      alive = false;
    };
  }, [url]);

  const box = fitBox(size);

  return (
    <Frame style={{ width: box.width, height: box.height }}>
      <img src={url} alt="" decoding="async" loading="eager" />
    </Frame>
  );
}
