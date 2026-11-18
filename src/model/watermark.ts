export type HorzAlign = 'left' | 'center' | 'right';
export type VertAlign = 'top' | 'center' | 'bottom';

/** Structure describing watermark options */
export interface WatermarkOptions {
	/** Color of the watermark */
	color: string;
	/** Visibility of the watermark. If false, other parameters are ignored */
	visible: boolean;
	/** Text of the watermark. Word wrapping is not supported */
	text: string;
	/** Font size in pixels */
	fontSize: number;
	/** Horizontal alignment of the watermark inside the chart area */
	horzAlign: HorzAlign;
	/** Vertical alignment of the watermark inside the chart area */
	vertAlign: VertAlign;
}
