/**
 * TypeScript interfaces for the AIBlackboard feature (Epic 4).
 */

export interface AnnotationBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface ExcalidrawElement {
  id: string
  type: 'rectangle' | 'ellipse' | 'arrow' | 'text' | 'diamond'
  x: number
  y: number
  width: number
  height: number
  strokeColor?: string
  backgroundColor?: string
  fillStyle?: 'solid' | 'hachure' | 'cross-hatch'
  text?: string
  fontSize?: number
  /** For arrow elements: [[x1,y1],[x2,y2]] */
  points?: number[][]
  opacity?: number
}

export interface ExplainAnnotationRequest {
  session_id: string
  clerk_user_id: string
  annotation_bounds: AnnotationBounds
  current_diagram_elements: ExcalidrawElement[]
  subject?: string
  concept?: string
}

export interface ExplainAnnotationResponse {
  explanation: string
  targeted_elements: string[]
  session_id: string
}

export interface BlackboardState {
  diagram_elements: ExcalidrawElement[]
  annotations_svg: string | null
  concept: string | null
  subject: string | null
}
