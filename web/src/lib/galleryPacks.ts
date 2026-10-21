export interface PackTokens {
  colors: {
    primary: string;
    accent: string;
    bgCanvas: string;
    textMain: string;
    border: string;
    [key: string]: string;
  };
  fonts: {
    heading: string;
    body: string;
    [key: string]: string;
  };
}

export interface PackLayoutItem {
  id: string;
  name: string;
  purpose: string;
  variants?: number;
}

export interface GalleryTemplatePack {
  id: string;
  name: string;
  description: string;
  aspectRatio: string;
  previewVideoUrl?: string;
  tags: {
    subject: string[];
    style: string[];
    effect: string[];
  };
  tokens: PackTokens;
  layouts: PackLayoutItem[];
}

export const TAG_LABELS: Record<string, string> = {
  // Subject
  'tong-hop': 'Tổng Hợp',
  'toan-tin': 'Toán - Tin',
  'khoa-hoc-tu-nhien': 'KHTN',
  'xa-hoi-nhan-van': 'KHXH & Nhân Văn',
  'ngoai-ngu': 'Ngoại Ngữ',
  'kinh-te-quan-tri': 'Kinh Tế & Quản Trị',
  // Style
  'hoc-thuat-nghiem-tuc': 'Học Thuật',
  'hien-dai-toi-gian': 'Hiện Đại Tối Giản',
  'sinh-dong-tre-trung': 'Sinh Động Trẻ Trung',
  'cong-nghe-tuong-lai': 'Công Nghệ Vị Lai',
  // Effect
  'nang-dong-kinetic': 'Kinetic Motion',
  'nhe-nhang-fade': 'Fade Nhẹ Nhàng',
  'chu-danh-may-typewriter': 'Typewriter Gõ Chữ',
};

export const SUBJECT_OPTIONS = [
  { value: 'tong-hop', label: 'Tổng Hợp' },
  { value: 'toan-tin', label: 'Toán - Tin Học' },
  { value: 'khoa-hoc-tu-nhien', label: 'Khoa Học Tự Nhiên' },
  { value: 'xa-hoi-nhan-van', label: 'Xã Hội & Nhân Văn' },
  { value: 'ngoai-ngu', label: 'Ngoại Ngữ' },
  { value: 'kinh-te-quan-tri', label: 'Kinh Tế & Quản Trị' },
];

export const STYLE_OPTIONS = [
  { value: 'hoc-thuat-nghiem-tuc', label: 'Học Thuật Nghiêm Túc' },
  { value: 'hien-dai-toi-gian', label: 'Hiện Đại Tối Giản' },
  { value: 'sinh-dong-tre-trung', label: 'Sinh Động Trẻ Trung' },
  { value: 'cong-nghe-tuong-lai', label: 'Công Nghệ Vị Lai' },
];

export const EFFECT_OPTIONS = [
  { value: 'nang-dong-kinetic', label: 'Năng Động Kinetic' },
  { value: 'nhe-nhang-fade', label: 'Nhẹ Nhàng Fade' },
  { value: 'chu-danh-may-typewriter', label: 'Chữ Đánh Máy (Typewriter)' },
];

export const GALLERY_PACKS: GalleryTemplatePack[] = [
  {
    id: 'basic',
    name: 'Học Thuật Cơ Bản (Academic Basic)',
    description: 'Bộ template học thuật kinh điển gồm 10 bố cục sư phạm chuẩn mực, hỗ trợ bảng màu Academic Ocean & Amber, phù hợp giảng đường và khóa học trực tuyến.',
    aspectRatio: '16:9',
    previewVideoUrl: 'renders/preview_basic.mp4',
    tags: {
      subject: ['tong-hop', 'xa-hoi-nhan-van', 'toan-tin'],
      style: ['hoc-thuat-nghiem-tuc'],
      effect: ['nang-dong-kinetic'],
    },
    tokens: {
      colors: {
        primary: '#0369A1',
        accent: '#D97706',
        bgCanvas: '#F5FAFF',
        textMain: '#0F172A',
        border: '#BAE6FD',
      },
      fonts: { heading: 'Be Vietnam Pro', body: 'Be Vietnam Pro' },
    },
    layouts: [
      { id: 'title-slide', name: 'Tiêu Đề Bài Giảng', purpose: 'title', variants: 5 },
      { id: 'learning-objectives', name: 'Mục Tiêu Bài Học', purpose: 'summary', variants: 3 },
      { id: 'concept-explain', name: 'Giải Thích Khái Niệm', purpose: 'concept-explain', variants: 4 },
      { id: 'bullet-breakdown', name: 'Phân Tích Đa Điểm', purpose: 'bullet-breakdown', variants: 2 },
      { id: 'image-explain', name: 'Minh Họa Hình Ảnh', purpose: 'image-explain', variants: 4 },
      { id: 'comparison', name: 'So Sánh Đối Xứng', purpose: 'comparison', variants: 2 },
      { id: 'timeline', name: 'Dòng Thời Gian', purpose: 'timeline', variants: 2 },
      { id: 'formula-explain', name: 'Công Thức & Logic', purpose: 'formula-explain', variants: 2 },
      { id: 'quiz', name: 'Câu Hỏi Tương Tác', purpose: 'quiz', variants: 2 },
      { id: 'summary', name: 'Tổng Kết Bài Học', purpose: 'summary', variants: 3 },
    ],
  },
  {
    id: 'pedagogy-visual',
    name: 'Sư Phạm Trực Quan & Sinh Động (Pedagogy Visual)',
    description: 'Bộ mẫu bài giảng sinh động tối ưu cho nhiều nội dung chữ, thẻ ghi nhớ, sơ đồ vector và hiệu ứng hoạt họa GSAP mượt mà.',
    aspectRatio: '16:9',
    previewVideoUrl: 'renders/preview_pedagogy.mp4',
    tags: {
      subject: ['toan-tin', 'khoa-hoc-tu-nhien', 'tong-hop'],
      style: ['sinh-dong-tre-trung', 'hien-dai-toi-gian'],
      effect: ['nang-dong-kinetic', 'nhe-nhang-fade'],
    },
    tokens: {
      colors: {
        primary: '#4F46E5',
        accent: '#059669',
        bgCanvas: '#F8FAFC',
        textMain: '#0F172A',
        border: '#CBD5E1',
      },
      fonts: { heading: 'Be Vietnam Pro', body: 'Be Vietnam Pro' },
    },
    layouts: [
      { id: 'title-slide', name: 'Tiêu Đề Trực Quan', purpose: 'title', variants: 3 },
      { id: 'concept-explain', name: 'Diễn Giải Trực Quan', purpose: 'concept-explain', variants: 4 },
      { id: 'bullet-breakdown', name: 'Hệ Thống Ý Chính', purpose: 'bullet-breakdown', variants: 2 },
      { id: 'comparison', name: 'So Sánh Hai Chiều', purpose: 'comparison', variants: 2 },
      { id: 'timeline', name: 'Tiến Trình Lịch Sử', purpose: 'timeline', variants: 2 },
    ],
  },
  {
    id: 'cyber-tech',
    name: 'Công Nghệ & Lập Trình (Cyber Tech)',
    description: 'Thiết kế vị lai mang âm hưởng IDE tối màu, phù hợp giảng dạy Lập trình, Trí tuệ Nhân tạo, Khoa học Dữ liệu và Kỹ thuật Phần mềm.',
    aspectRatio: '16:9',
    previewVideoUrl: 'renders/preview_tech.mp4',
    tags: {
      subject: ['toan-tin', 'khoa-hoc-tu-nhien'],
      style: ['cong-nghe-tuong-lai'],
      effect: ['chu-danh-may-typewriter', 'nang-dong-kinetic'],
    },
    tokens: {
      colors: {
        primary: '#06B6D4',
        accent: '#10B981',
        bgCanvas: '#0B0F19',
        textMain: '#F8FAFC',
        border: '#1E293B',
      },
      fonts: { heading: 'Be Vietnam Pro', body: 'JetBrains Mono' },
    },
    layouts: [
      { id: 'title-slide', name: 'Tech Hero Title', purpose: 'title', variants: 3 },
      { id: 'code-walkthrough', name: 'Code Block Step-through', purpose: 'concept-explain', variants: 2 },
      { id: 'architecture-diagram', name: 'System Architecture', purpose: 'image-explain', variants: 3 },
      { id: 'terminal-quiz', name: 'Interactive Debug Quiz', purpose: 'quiz', variants: 2 },
    ],
  },
  {
    id: 'vibrant-science',
    name: 'Khoa Học Tự Nhiên (Vibrant Science)',
    description: 'Bảng màu Emerald & Amber tràn đầy năng lượng, tối ưu cho bài giảng Sinh học, Hóa học, Y dược học và Địa lý trực quan.',
    aspectRatio: '16:9',
    previewVideoUrl: 'renders/preview_science.mp4',
    tags: {
      subject: ['khoa-hoc-tu-nhien'],
      style: ['sinh-dong-tre-trung'],
      effect: ['nang-dong-kinetic'],
    },
    tokens: {
      colors: {
        primary: '#059669',
        accent: '#F59E0B',
        bgCanvas: '#F0FDF4',
        textMain: '#064E3B',
        border: '#A7F3D0',
      },
      fonts: { heading: 'Be Vietnam Pro', body: 'Be Vietnam Pro' },
    },
    layouts: [
      { id: 'title-slide', name: 'Khám Phá Khoa Học', purpose: 'title', variants: 2 },
      { id: 'experiment-step', name: 'Quy Trình Thí Nghiệm', purpose: 'timeline', variants: 2 },
      { id: 'specimen-viewer', name: 'Mẫu Vật Trực Quan', purpose: 'image-explain', variants: 3 },
    ],
  },
  {
    id: 'minimal-modern',
    name: 'Hiện Đại Tối Giản (Minimalist Pro)',
    description: 'Bố cục thoáng đạt với tỷ lệ vàng typography Thụy Sĩ, tập trung tối đa vào thông điệp và luận điểm kinh tế - quản trị kinh doanh.',
    aspectRatio: '16:9',
    previewVideoUrl: 'renders/preview_minimal.mp4',
    tags: {
      subject: ['kinh-te-quan-tri', 'ngoai-ngu'],
      style: ['hien-dai-toi-gian'],
      effect: ['nhe-nhang-fade'],
    },
    tokens: {
      colors: {
        primary: '#18181B',
        accent: '#71717A',
        bgCanvas: '#FFFFFF',
        textMain: '#09090B',
        border: '#E4E4E7',
      },
      fonts: { heading: 'Be Vietnam Pro', body: 'Be Vietnam Pro' },
    },
    layouts: [
      { id: 'title-slide', name: 'Executive Title', purpose: 'title', variants: 2 },
      { id: 'market-stats', name: 'Chỉ Số Thị Trường', purpose: 'comparison', variants: 2 },
      { id: 'key-takeaways', name: 'Luận Điểm Quản Trị', purpose: 'summary', variants: 2 },
    ],
  },
];

export function filterGalleryPacks(
  packs: GalleryTemplatePack[],
  searchTerm: string,
  selectedSubjects: string[],
  selectedStyles: string[],
  selectedEffects: string[]
): GalleryTemplatePack[] {
  const query = searchTerm.trim().toLowerCase();

  return packs.filter((pack) => {
    // 1. Search term match
    if (query) {
      const matchName = pack.name.toLowerCase().includes(query);
      const matchDesc = pack.description.toLowerCase().includes(query);
      const matchTags = Object.values(pack.tags)
        .flat()
        .some((t) => t.toLowerCase().includes(query) || (TAG_LABELS[t] || '').toLowerCase().includes(query));
      if (!matchName && !matchDesc && !matchTags) {
        return false;
      }
    }

    // 2. Subject filter (OR within group)
    if (selectedSubjects.length > 0) {
      const hasSubject = pack.tags.subject.some((s) => selectedSubjects.includes(s));
      if (!hasSubject) return false;
    }

    // 3. Style filter (OR within group)
    if (selectedStyles.length > 0) {
      const hasStyle = pack.tags.style.some((st) => selectedStyles.includes(st));
      if (!hasStyle) return false;
    }

    // 4. Effect filter (OR within group)
    if (selectedEffects.length > 0) {
      const hasEffect = pack.tags.effect.some((ef) => selectedEffects.includes(ef));
      if (!hasEffect) return false;
    }

    return true;
  });
}
