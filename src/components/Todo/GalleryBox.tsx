import { ChangeEvent, TouchEvent, WheelEvent, useEffect, useRef, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";
import { db } from "../../firebase";

interface GalleryPhoto {
  id: string;
  imageData: string;
  name: string;
  createdAt: number;
}

const photosCollection = collection(db, "galleryPhotos");
const MAX_IMAGE_SIZE = 900;
const JPEG_QUALITY = 0.62;

const getErrorMessage = (error: unknown) => {
  if (error && typeof error === "object" && "code" in error) {
    return `사진 처리 실패: ${String((error as { code: unknown }).code)}`;
  }

  return "사진을 처리하지 못했어요";
};

const resizePhoto = async (file: File) => {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_SIZE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");

  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
};

export default function GalleryBox() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pinchDistanceRef = useRef<number | null>(null);
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryPhoto | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [showList, setShowList] = useState(() => {
    const saved = localStorage.getItem("galleryBox_showList");
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem("galleryBox_showList", JSON.stringify(showList));
  }, [showList]);

  useEffect(() => {
    const photosQuery = query(photosCollection, orderBy("createdAt", "desc"));

    return onSnapshot(
      photosQuery,
      (snapshot) => {
        setPhotos(
          snapshot.docs.map((photoDoc) => ({
            id: photoDoc.id,
            ...(photoDoc.data() as Omit<GalleryPhoto, "id">),
          }))
        );
      },
      (error) => {
        setMessage(getErrorMessage(error));
      }
    );
  }, []);

  const uploadPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setMessage("");

    try {
      const id = crypto.randomUUID();
      const imageData = await resizePhoto(file);

      await setDoc(doc(db, "galleryPhotos", id), {
        imageData,
        name: file.name,
        createdAt: Date.now(),
      });
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  const deletePhoto = async (photo: GalleryPhoto) => {
    const confirmed = window.confirm("사진을 삭제할까요?");
    if (!confirmed) return;

    setMessage("");

    try {
      await deleteDoc(doc(db, "galleryPhotos", photo.id));
      if (selectedPhoto?.id === photo.id) {
        setSelectedPhoto(null);
      }
    } catch (error) {
      setMessage(getErrorMessage(error));
    }
  };

  const openPhoto = (photo: GalleryPhoto) => {
    setSelectedPhoto(photo);
    setZoom(1);
  };

  const closePhoto = () => {
    setSelectedPhoto(null);
    setZoom(1);
  };

  const zoomOut = () => {
    setZoom((value) => Math.max(0.5, Number((value - 0.25).toFixed(2))));
  };

  const zoomIn = () => {
    setZoom((value) => Math.min(2.5, Number((value + 0.25).toFixed(2))));
  };

  const setClampedZoom = (value: number) => {
    setZoom(Math.min(2.5, Math.max(0.5, Number(value.toFixed(2)))));
  };

  const handleWheelZoom = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const nextZoom = zoom + (event.deltaY > 0 ? -0.12 : 0.12);
    setClampedZoom(nextZoom);
  };

  const getTouchDistance = (event: TouchEvent<HTMLDivElement>) => {
    const [first, second] = [event.touches[0], event.touches[1]];
    return Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (event.touches.length === 2) {
      pinchDistanceRef.current = getTouchDistance(event);
    }
  };

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 2 || pinchDistanceRef.current === null) return;

    event.preventDefault();
    const nextDistance = getTouchDistance(event);
    const nextZoom = zoom * (nextDistance / pinchDistanceRef.current);
    pinchDistanceRef.current = nextDistance;
    setClampedZoom(nextZoom);
  };

  const handleTouchEnd = () => {
    pinchDistanceRef.current = null;
  };

  return (
    <div className="w-full rounded bg-transparent shadow-none transition-opacity">
      <div className="mt-[3px] flex items-center justify-between">
        <button
          type="button"
          className="mx-1 cursor-pointer text-xs text-zinc-400 transition hover:text-zinc-900 dark:hover:text-white"
          onClick={() => setShowList(!showList)}
          aria-label={showList ? "숨기기" : "펼치기"}
          title={showList ? "숨기기" : "펼치기"}
        >
          {showList ? "▽" : "▷"}
        </button>

        <h2 className="min-w-0 flex-1 truncate bg-transparent text-xs text-blue-600 outline-none dark:text-blue-300">
          사진
        </h2>

        {showList && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="rounded px-2 py-0.5 text-xs font-semibold text-zinc-500 transition hover:text-blue-600 disabled:opacity-40 dark:text-zinc-400 dark:hover:text-blue-300"
          >
            {isUploading ? "처리 중" : "+ 사진"}
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={uploadPhoto}
        />
      </div>

      {showList && (
        <>
          {message && (
            <div className="mt-2 rounded px-2 py-1 text-xs text-red-500 dark:text-red-400">
              {message}
            </div>
          )}

          <div className="mt-2 grid grid-cols-3 gap-1.5 xs:grid-cols-4 sm:grid-cols-5">
            {photos.map((photo) => (
              <article
                key={photo.id}
                className="group relative aspect-square overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800"
              >
                <button
                  type="button"
                  onClick={() => openPhoto(photo)}
                  className="block h-full w-full"
                >
                  <img
                    src={photo.imageData}
                    alt={photo.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </button>

                <button
                  type="button"
                  onClick={() => deletePhoto(photo)}
                  className="absolute right-1 top-1 rounded bg-black/50 px-1.5 py-0.5 text-[11px] font-bold text-white opacity-0 transition group-hover:opacity-100"
                  title="삭제"
                >
                  X
                </button>
              </article>
            ))}
          </div>

          {photos.length === 0 && !message && (
            <div className="px-2 py-6 text-center text-xs text-zinc-400">
              아직 사진이 없어요
            </div>
          )}
        </>
      )}

      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3"
          onClick={closePhoto}
        >
          <div
            className="relative flex max-h-full max-w-full flex-col items-center"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-2 flex items-center gap-1 rounded bg-black/55 p-1 text-xs font-bold text-white">
              <button
                type="button"
                onClick={zoomOut}
                className="rounded px-2 py-1 hover:bg-white/15 disabled:opacity-40"
                disabled={zoom <= 0.5}
                title="축소"
              >
                -
              </button>
              <button
                type="button"
                onClick={() => setZoom(1)}
                className="min-w-[42px] rounded px-2 py-1 hover:bg-white/15"
                title="기본 크기"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                onClick={zoomIn}
                className="rounded px-2 py-1 hover:bg-white/15 disabled:opacity-40"
                disabled={zoom >= 2.5}
                title="확대"
              >
                +
              </button>
            </div>

            <div
              className="max-h-[86vh] max-w-[96vw] touch-none overflow-auto rounded"
              onWheel={handleWheelZoom}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
            >
              <img
                src={selectedPhoto.imageData}
                alt={selectedPhoto.name}
                className="block max-h-[86vh] max-w-[96vw] rounded object-contain"
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: "top center",
                }}
              />
            </div>
            <button
              type="button"
              onClick={closePhoto}
              className="absolute right-2 top-2 rounded bg-black/55 px-2 py-1 text-xs font-bold text-white"
              title="닫기"
            >
              X
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
