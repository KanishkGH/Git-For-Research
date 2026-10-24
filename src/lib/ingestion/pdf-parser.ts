import type {
  IngestionInput,
  IngestionResult,
  ParsedArtifact,
  ArtifactParser,
  ArtifactType,
} from '@/lib/ingestion/types'

export class PdfParser implements ArtifactParser {
  supports(detectedType: ArtifactType): boolean {
    return detectedType === 'pdf'
  }

  async parse(input: IngestionInput): Promise<IngestionResult> {
    try {
      const buffer = Buffer.isBuffer(input.buffer)
        ? input.buffer
        : Buffer.from(input.buffer)

      if (buffer.length === 0) {
        return {
          success: false,
          error: 'The uploaded PDF file is empty.',
          code: 'EMPTY_DOCUMENT',
        }
      }

      let pdfData: { numpages: number; text: string }
      try {
        // Load the Node canvas worker before pdf-parse so PDF.js has DOMMatrix.
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { CanvasFactory } = require('pdf-parse/worker')
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { PDFParse } = require('pdf-parse')
        const parser = new PDFParse({ data: new Uint8Array(buffer), CanvasFactory })
        try {
          const result = await parser.getText()
          pdfData = { numpages: result.total, text: result.text }
        } finally {
          await parser.destroy()
        }
      } catch (pdfErr) {
        return {
          success: false,
          error: `Could not extract text from PDF: ${pdfErr instanceof Error ? pdfErr.message : 'Extraction error'}`,
          code: 'PDF_EXTRACTION_FAILED',
        }
      }

      const extractedText = pdfData.text ? pdfData.text.trim() : ''

      if (!extractedText) {
        return {
          success: false,
          error:
            'PDF contains no extractable digital text. Scanned or image-only PDFs require OCR which is not supported in this version.',
          code: 'PDF_NO_TEXT',
        }
      }

      const title =
        input.filename.replace(/\.pdf$/i, '').trim() || 'Extracted PDF Document'

      const canonicalContent = [
        `# PDF Document: ${title}`,
        `*Extracted Document | Pages: ${pdfData.numpages}*`,
        '\n---',
        extractedText,
      ].join('\n\n')

      const wordCount = canonicalContent.split(/\s+/).filter(Boolean).length
      const charCount = canonicalContent.length

      const parsed: ParsedArtifact = {
        artifactType: 'pdf',
        title,
        canonicalContent,
        originalFilename: input.filename,
        detectedMimeType: 'application/pdf',
        metadata: {
          originalFilename: input.filename,
          detectedMimeType: 'application/pdf',
          byteSize: buffer.length,
          wordCount,
          charCount,
          pageCount: pdfData.numpages,
          sourceType: 'pdf',
          extractedAt: new Date().toISOString(),
          title,
        },
      }

      return { success: true, data: parsed }
    } catch (err) {
      return {
        success: false,
        error: `Failed to parse PDF document: ${err instanceof Error ? err.message : 'Unknown error'}`,
        code: 'PARSING_ERROR',
      }
    }
  }
}

export const pdfParser = new PdfParser()
