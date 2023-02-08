/* eslint-disable @next/next/no-img-element */
import type { LexicalEditor, NodeKey } from 'lexical'

import * as React from 'react'
import { Suspense, useRef } from 'react'

const imageCache = new Set()

function useSuspenseImage(src: string) {
  if (!imageCache.has(src)) {
    throw new Promise((resolve) => {
      const img = new Image()
      img.src = src
      img.onload = () => {
        imageCache.add(src)
        resolve(null)
      }
    })
  }
}

function LazyImage({
  altText,
  title,
  className,
  imageRef,
  src,
  width,
  height,
  maxWidth,
}: {
  altText: string
  className: string | null
  height: 'inherit' | number
  imageRef: { current: null | HTMLImageElement }
  maxWidth: number
  src: string
  title: string | undefined
  width: 'inherit' | number
}): JSX.Element {
  useSuspenseImage(src)
  return (
    <img
      className={className || undefined}
      src={src}
      title={title}
      alt={altText}
      ref={imageRef}
      style={{
        height,
        maxWidth,
        width,
      }}
    />
  )
}

export default function ImageComponent({
  src,
  title,
  altText,
  width,
  height,
  maxWidth,
}: {
  title: string | undefined
  altText: string
  caption: LexicalEditor
  height: 'inherit' | number
  maxWidth: number
  nodeKey: NodeKey
  resizable: boolean
  showCaption: boolean
  src: string
  width: 'inherit' | number
  captionsEnabled: boolean
}): JSX.Element {
  const imageRef = useRef<null | HTMLImageElement>(null)

  return (
    <Suspense fallback={null}>
      <>
        <div>
          <LazyImage
            className=""
            src={src}
            title={title}
            altText={altText}
            imageRef={imageRef}
            width={width}
            height={height}
            maxWidth={maxWidth}
          />
        </div>
      </>
    </Suspense>
  )
}
