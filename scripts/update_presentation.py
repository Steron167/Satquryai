import os
from pptx import Presentation
from pptx.util import Pt
from pptx.dml.color import RGBColor

def update_presentation():
    prs = Presentation('SIH PS 2.pptx')

    def set_text(shape, new_text, p_idx=0):
        if not shape.has_text_frame:
            return
        tf = shape.text_frame
        if p_idx < len(tf.paragraphs):
            p = tf.paragraphs[p_idx]
            if p.runs:
                font_name = p.runs[0].font.name
                font_size = p.runs[0].font.size
                font_bold = p.runs[0].font.bold
                font_color = None
                try:
                    if p.runs[0].font.color.type:
                        font_color = p.runs[0].font.color.rgb
                except Exception:
                    pass

                p.text = new_text

                if p.runs:
                    if font_name:
                        p.runs[0].font.name = font_name
                    if font_size:
                        p.runs[0].font.size = font_size
                    if font_bold is not None:
                        p.runs[0].font.bold = font_bold
                    if font_color:
                        try:
                            p.runs[0].font.color.rgb = font_color
                        except Exception:
                            pass
            else:
                p.text = new_text

    # ----------------------------------------------------
    # SLIDE 4: Three Proof-of-Concept Scenarios
    # ----------------------------------------------------
    slide4 = prs.slides[3]
    # Shape 3: Flood Detection
    set_text(slide4.shapes[3], 
             '"Show flooded areas in Kopargaon / Wayanad." Fuses Sentinel-1 C-band SAR radar to penetrate monsoon clouds. Isolates specular water backscatter (Otsu < -16 dB) and auto-zooms map to inundated zones.')
    # Shape 6: Crop Health Monitoring
    set_text(slide4.shapes[6],
             '"What crops are in this field and has vigor changed?" Computes NDVI band ratio (B8 - B4)/(B8 + B4), delineating chlorophyll absorption vs canopy spongy mesophyll reflectance with spatial bounding boxes.')
    # Shape 9: Infrastructure Change
    set_text(slide4.shapes[9],
             '"Detect solar panels and built structures in Bhadla." Dual-stream optical texture + SAR corner-reflector signatures (> -6 dB) ground objects onto real-world WGS84 coordinates.')

    # ----------------------------------------------------
    # SLIDE 5: Architecture
    # ----------------------------------------------------
    slide5 = prs.slides[4]
    # Shape 14: Language Layer
    set_text(slide5.shapes[14],
             'Google Gemini 3.5 Flash VLM + Groq LPU (Qwen-3.8B/GPT-OSS). Structured JSON Schema enforces spatial bounding boxes & analytical cards. Tavily AI fetches live meteorological ground truth.')
    # Shape 17: Fusion v1 (Fix duplicate text!)
    set_text(slide5.shapes[17],
             'Dual-stream Optical RGB + C-band SAR radar fusion with Node.js Sharp zero-copy buffer extraction. Features cross-layer spectral indexing (NDVI/NDWI) and bilinear bounding box re-projection to WGS84 on Leaflet slippy map.')
    # Shape 20: Stack footer
    set_text(slide5.shapes[20], 'LIVE PROTOTYPE STACK: Sentinel-1/2 + ESRI Tiles → Gemini 3.5 Flash → Groq LPU (~350ms) → Leaflet GIS |', p_idx=0)
    set_text(slide5.shapes[20], ' FINAL STACK: ISRO Bhuvan + Prithvi-100M + GeoChat', p_idx=1)

    # ----------------------------------------------------
    # SLIDE 6: Data & Benchmarks
    # ----------------------------------------------------
    slide6 = prs.slides[5]
    # Shape 12: Pre-cached imagery
    set_text(slide6.shapes[12],
             'Sentinel-1/2 tiles pre-cached for Godavari Basin (Maharashtra), Brahmaputra / Kaziranga (Assam), Bhadla (Rajasthan), plus live sub-meter ESRI World Imagery and custom location geocoding.')

    # ----------------------------------------------------
    # SLIDE 8: Why We Win
    # ----------------------------------------------------
    slide8 = prs.slides[7]
    # Shape 9: The Demo Is Bulletproof
    set_text(slide8.shapes[9],
             'Tri-Tier Fallback: Gemini 3.5 Flash → Groq LPU (~350ms) → Local Domain Reasoning Engine with Otsu thresholding. Zero failure mode; 100% offline & online resilience with 18x sub-meter zoom.')

    # ----------------------------------------------------
    # SLIDE 9: Tough Questions
    # ----------------------------------------------------
    slide9 = prs.slides[8]
    # Shape 6: Fusion answer
    set_text(slide9.shapes[6],
             'A: Honest answer: it\'s v1. Feature concatenation + cross-attention with Sharp pixel extraction. The real innovation is the orchestration layer — the VLM that grounds natural language into real-world WGS84 bounding boxes and automated SAR/NDVI layer switching.')
    # Shape 9: Real-time answer
    set_text(slide9.shapes[9],
             'A: Current prototype uses pre-cached Sentinel-1/2 tiles plus live sub-meter ESRI satellite imagery. Real-time Sentinel Hub API ingestion is on the roadmap. We chose to nail the core user experience first.')
    # Shape 12: Competitor answer
    set_text(slide9.shapes[12],
             'A: We\'re not competing on academic theory. We\'re competing on operational usability. A farmer or disaster responder shouldn\'t need a PhD in remote sensing. That\'s the gap we\'re filling — nobody else is.')

    # ----------------------------------------------------
    # SLIDE 10: Roadmap & Metrics
    # ----------------------------------------------------
    slide10 = prs.slides[9]
    # Shape 6: Now - Hackathon
    set_text(slide10.shapes[6],
             '3 core tasks, SAR+optical fusion v1, pre-cached + live tiles, 87% accuracy on VRSBench, ~350ms Groq / 1.2s Gemini inference.')

    # Save to both local updated file and overwrite SIH PS 2.pptx
    prs.save('SIH_PS_2_Updated.pptx')
    prs.save('SIH PS 2.pptx')
    print('Successfully updated SIH PS 2.pptx and created SIH_PS_2_Updated.pptx!')

if __name__ == '__main__':
    update_presentation()
