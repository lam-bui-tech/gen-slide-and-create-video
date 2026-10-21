'use client';

import React from 'react';
import { GalleryModal } from './GalleryModal';
import { UploadProgressModal } from './UploadProgressModal';
import { ClarificationModal } from './ClarificationModal';
import { OutlineReviewModal } from './OutlineReviewModal';
import { PedagogyModal } from './PedagogyModal';
import { ImageModal } from './ImageModal';
import { HelpModal } from './HelpModal';

export function ModalHost() {
  return (
    <>
      <GalleryModal />
      <UploadProgressModal />
      <ClarificationModal />
      <OutlineReviewModal />
      <PedagogyModal />
      <ImageModal />
      <HelpModal />
    </>
  );
}
