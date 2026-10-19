import { z } from "zod";

// ==========================================
// Common Enums
// ==========================================

export const TemplateIdEnum = z.enum([
  "title-slide",
  "learning-objectives",
  "concept-explain",
  "bullet-breakdown",
  "image-explain",
  "comparison",
  "timeline",
  "formula-explain",
  "quiz",
  "summary",
]);
export type TemplateId = z.infer<typeof TemplateIdEnum>;

export const AnimationPresetEnum = z.enum([
  "fade-in",
  "slide-in",
  "zoom-in",
  "typewriter",
  "step-by-step",
  "highlight-keyword",
]);
export type AnimationPreset = z.infer<typeof AnimationPresetEnum>;

export const TTSProviderEnum = z.enum(["vieneu", "viettel", "fake"]);
export type TTSProvider = z.infer<typeof TTSProviderEnum>;

export const FileTypeEnum = z.enum(["pptx", "pdf", "docx", "md"]);
export type FileType = z.infer<typeof FileTypeEnum>;

// ==========================================
// 1. DocumentContext Schemas
// ==========================================

export const ExtractedImageSchema = z.object({
  id: z.string(),
  filePath: z.string(),
  originalName: z.string().optional(),
  width: z.number().int().optional(),
  height: z.number().int().optional(),
  format: z.string().optional(),
});
export type ExtractedImage = z.infer<typeof ExtractedImageSchema>;

export const DocumentTableSchema = z.object({
  headers: z.array(z.string()).optional(),
  rows: z.array(z.array(z.string())).optional(),
});
export type DocumentTable = z.infer<typeof DocumentTableSchema>;

export const DocumentSectionSchema = z.object({
  sectionId: z.string(),
  title: z.string(),
  contentOrder: z.number().int(),
  bullets: z.array(z.string()).default([]),
  tables: z.array(DocumentTableSchema).default([]),
  speakerNotes: z.string().optional(),
  imageIds: z.array(z.string()).default([]),
});
export type DocumentSection = z.infer<typeof DocumentSectionSchema>;

export const DocumentContextSchema = z.object({
  title: z.string(),
  sourceFileName: z.string(),
  fileType: FileTypeEnum,
  sections: z.array(DocumentSectionSchema),
  author: z.string().optional(),
  subject: z.string().optional(),
  extractedImages: z.array(ExtractedImageSchema).default([]),
  metadata: z.record(z.any()).default({}),
});
export type DocumentContext = z.infer<typeof DocumentContextSchema>;

// ==========================================
// 2. LessonOutline Schemas
// ==========================================

export const OutlineSlideSchema = z.object({
  slideId: z.string(),
  suggestedTemplateId: TemplateIdEnum,
  title: z.string(),
  keyTakeaways: z.array(z.string()),
  speakerNotesDraft: z.string(),
  contentPayload: z.record(z.any()).optional(),
});
export type OutlineSlide = z.infer<typeof OutlineSlideSchema>;

export const QuizQuestionSchema = z.object({
  question: z.string(),
  options: z.array(z.string()).min(2),
  correctIndex: z.number().int(),
  explanation: z.string(),
});
export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;

export const OutlineSectionSchema = z.object({
  sectionTitle: z.string(),
  description: z.string().optional(),
  slideCount: z.number().int(),
});
export type OutlineSection = z.infer<typeof OutlineSectionSchema>;

export const LessonOutlineSchema = z.object({
  topic: z.string(),
  targetAudience: z.string(),
  estimatedDurationMinutes: z.number(),
  learningObjectives: z.array(z.string()).min(1),
  slides: z.array(OutlineSlideSchema).min(1),
  summary: z.string(),
  sections: z.array(OutlineSectionSchema).default([]),
  quiz: z.array(QuizQuestionSchema).default([]),
  status: z.enum(["draft", "approved"]).default("draft"),
});
export type LessonOutline = z.infer<typeof LessonOutlineSchema>;

// ==========================================
// 3. LessonSceneJSON Schemas
// ==========================================

export const AnimationItemSchema = z.object({
  target: z.string(),
  preset: AnimationPresetEnum,
  delay: z.number().min(0.0),
  duration: z.number().min(0.1),
  easing: z.string().default("power2.out"),
});
export type AnimationItem = z.infer<typeof AnimationItemSchema>;

export const VoiceConfigSchema = z.object({
  narration: z.string(),
  provider: TTSProviderEnum,
  voiceId: z.string().optional(),
  audioUrl: z.string().optional(),
  durationSeconds: z.number().min(0.0).optional(),
});
export type VoiceConfig = z.infer<typeof VoiceConfigSchema>;

export const SlideElementSchema = z.object({
  id: z.string(),
  type: z.enum([
    "text",
    "heading",
    "badge",
    "card",
    "bullet-list",
    "image",
    "comparison-table",
    "timeline-step",
    "formula",
    "quiz-block",
  ]),
  content: z.any().optional(),
  style: z.record(z.any()).optional(),
});
export type SlideElement = z.infer<typeof SlideElementSchema>;

export const SlideSceneSchema = z.object({
  slideId: z.string(),
  templateId: TemplateIdEnum,
  layoutVariant: z.string().default("default"),
  title: z.string(),
  subtitle: z.string().optional(),
  elements: z.array(SlideElementSchema).default([]),
  animations: z.array(AnimationItemSchema).default([]),
  voice: VoiceConfigSchema,
  durationSeconds: z.number().min(1.0),
  notes: z.string().optional(),
});
export type SlideScene = z.infer<typeof SlideSceneSchema>;

export const LessonSceneSchema = z.object({
  projectId: z.string(),
  title: z.string(),
  slides: z.array(SlideSceneSchema).min(1),
  theme: z
    .object({
      colorScheme: z.string().default("academic-ocean"),
      fontFamily: z.string().default("Inter, sans-serif"),
      aspectRatio: z.string().default("16:9"),
    })
    .optional(),
  totalDurationSeconds: z.number().optional(),
});
export type LessonSceneJSON = z.infer<typeof LessonSceneSchema>;
