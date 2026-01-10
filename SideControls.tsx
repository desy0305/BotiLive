/* tslint:disable */
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Copyright 2025 Google LLC

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at

//     https://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {useAtom} from 'jotai';
import React from 'react';
// Fixed: Added missing atom imports
import {
  BumpSessionAtom,
  DrawModeAtom,
  ImageSentAtom,
  ImageSrcAtom,
  IsUploadedImageAtom,
} from './atoms';
import {useResetState} from './hooks';

export function SideControls() {
  const [, setImageSrc] = useAtom(ImageSrcAtom);
  const [drawMode, setDrawMode] = useAtom(DrawModeAtom);
  const [, setIsUploadedImage] = useAtom(IsUploadedImageAtom);
  const [, setBumpSession] = useAtom(BumpSessionAtom);
  const [, setImageSent] = useAtom(ImageSentAtom);
  
  // Fix: Use type assertion to resolve the 'never' type error and ensure resetState is callable.
  const resetState = useResetState() as () => void;

  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center button bg-[#3B68FF] px-12 !text-white !border-none">
        <input
          className="hidden"
          type="file"
          accept=".jpg, .jpeg, .png, .webp"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = (ev) => {
                resetState();
                setImageSrc(ev.target?.result as string);
                setIsUploadedImage(true);
                setImageSent(false);
                setBumpSession((prev) => prev + 1);
              };
              reader.readAsDataURL(file);
            }
          }}
        />
        <div>Upload an image</div>
      </label>
      <div className="hidden">
        <button
          className="button flex gap-3 justify-center items-center"
          onClick={() => {
            setDrawMode(!drawMode);
          }}>
          <div className="text-lg"> 🎨</div>
          <div>Draw on image</div>
        </button>
      </div>
    </div>
  );
}
