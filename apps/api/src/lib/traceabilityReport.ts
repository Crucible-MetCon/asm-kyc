import PDFDocument from 'pdfkit';
import { prisma } from '@asm-kyc/database';
import type { TraceabilityPreview, TraceabilityStep } from '@asm-kyc/shared';

const FONT_SIZE_TITLE = 20;
const FONT_SIZE_HEADING = 14;
const FONT_SIZE_BODY = 10;
const FONT_SIZE_SMALL = 8;
const MARGIN = 50;
const PAGE_WIDTH = 595.28; // A4
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const ROLE_LABELS: Record<string, string> = {
  MINER_USER: 'Miner',
  AGGREGATOR_USER: 'Aggregator',
  MELTER_USER: 'Melter',
  PROCESSOR_USER: 'Processor',
  TRADER_USER: 'Trader',
  REFINER_USER: 'Refiner',
  ADMIN_USER: 'Admin',
};

function addSectionHeading(doc: PDFKit.PDFDocument, title: string) {
  doc.moveDown(0.5);
  doc.fontSize(FONT_SIZE_HEADING).font('Helvetica-Bold').text(title);
  doc.moveDown(0.3);
  doc.moveTo(MARGIN, doc.y).lineTo(PAGE_WIDTH - MARGIN, doc.y).stroke('#cccccc');
  doc.moveDown(0.3);
  doc.font('Helvetica').fontSize(FONT_SIZE_BODY);
}

function addField(doc: PDFKit.PDFDocument, label: string, value: string | null) {
  doc.font('Helvetica-Bold').text(`${label}: `, { continued: true });
  doc.font('Helvetica').text(value ?? 'N/A');
}

function checkPageBreak(doc: PDFKit.PDFDocument, needed: number = 100) {
  if (doc.y + needed > doc.page.height - MARGIN - 30) {
    doc.addPage();
  }
}

/** Generate a unique document code for the traceability report. */
export function generateDocCode(): string {
  const year = new Date().getFullYear();
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `GT-TRACE-${year}-${rand}`;
}

/** Build the traceability preview data for a record. */
export async function buildTraceabilityPreview(recordId: string): Promise<TraceabilityPreview> {
  const record = await prisma.record.findUnique({
    where: { id: recordId },
    include: {
      creator: { include: { miner_profile: true } },
      mine_site: true,
      receipts: {
        orderBy: { received_at: 'asc' },
        include: {
          receiver: { include: { miner_profile: true } },
          purities: { orderBy: { sort_order: 'asc' } },
        },
      },
      purchase_items: {
        include: {
          purchase: {
            include: {
              trader: { include: { miner_profile: true } },
              items: {
                include: {
                  record: true,
                },
              },
            },
          },
        },
      },
      compliance_reviews: {
        orderBy: { reviewed_at: 'desc' },
        take: 1,
      },
      metal_purities: {
        where: { receipt_id: null },
        orderBy: { sort_order: 'asc' },
      },
    },
  });

  if (!record) throw new Error('Record not found');

  const minerName = record.creator.miner_profile?.full_name ?? record.creator.username;

  // Get Au purity from the record's own purities
  const auPurity = record.metal_purities.find((p) => p.element === 'Au');

  // Build chain of custody
  const chain: TraceabilityStep[] = [];

  // Step 0: Origin
  chain.push({
    step_number: 0,
    actor_name: minerName,
    actor_role: ROLE_LABELS[record.creator.role] || record.creator.role,
    action: 'ORIGIN',
    weight_grams: record.weight_grams ? Number(record.weight_grams) : null,
    purity_au: auPurity ? Number(auPurity.purity) : (record.estimated_purity ? Number(record.estimated_purity) : null),
    gps_latitude: record.gps_latitude ? Number(record.gps_latitude) : null,
    gps_longitude: record.gps_longitude ? Number(record.gps_longitude) : null,
    country: record.country,
    locality: record.locality,
    timestamp: record.created_at.toISOString(),
  });

  // Steps 1-N: Each receipt
  for (let i = 0; i < record.receipts.length; i++) {
    const receipt = record.receipts[i];
    const receiverName = receipt.receiver.miner_profile?.full_name ?? receipt.receiver.username;
    const receiptAu = receipt.purities.find((p) => p.element === 'Au');
    chain.push({
      step_number: i + 1,
      actor_name: receiverName,
      actor_role: ROLE_LABELS[receipt.receiver.role] || receipt.receiver.role,
      action: 'RECEIPT',
      weight_grams: receipt.receipt_weight ? Number(receipt.receipt_weight) : null,
      purity_au: receiptAu ? Number(receiptAu.purity) : null,
      gps_latitude: receipt.gps_latitude ? Number(receipt.gps_latitude) : null,
      gps_longitude: receipt.gps_longitude ? Number(receipt.gps_longitude) : null,
      country: receipt.country,
      locality: receipt.locality,
      timestamp: receipt.received_at.toISOString(),
    });
  }

  // Build purchase combinations
  const combinations = record.purchase_items.map((pi) => {
    const purchase = pi.purchase;
    const traderName = purchase.trader.miner_profile?.full_name ?? purchase.trader.username;
    const otherRecords = purchase.items
      .filter((item) => item.record_id !== recordId)
      .map((item) => ({
        record_number: item.record.record_number,
        weight_grams: item.record.weight_grams ? Number(item.record.weight_grams) : null,
      }));

    return {
      purchase_id: purchase.id,
      trader_name: traderName,
      purchased_at: purchase.purchased_at.toISOString(),
      total_weight: Number(purchase.total_weight),
      other_records: otherRecords,
    };
  });

  // Build weight history
  const weightHistory: TraceabilityPreview['weight_history'] = [];
  weightHistory.push({
    stage: 'Origin (Miner)',
    weight_grams: record.weight_grams ? Number(record.weight_grams) : null,
    actor: minerName,
    timestamp: record.created_at.toISOString(),
  });
  for (const receipt of record.receipts) {
    const receiverName = receipt.receiver.miner_profile?.full_name ?? receipt.receiver.username;
    const roleLabel = ROLE_LABELS[receipt.receiver.role] || receipt.receiver.role;
    weightHistory.push({
      stage: `Receipt (${roleLabel})`,
      weight_grams: receipt.receipt_weight ? Number(receipt.receipt_weight) : null,
      actor: receiverName,
      timestamp: receipt.received_at.toISOString(),
    });
  }

  return {
    record_id: record.id,
    record_number: record.record_number,
    doc_code: generateDocCode(),
    current_status: record.status,
    gold_type: record.gold_type,
    origin: {
      miner_name: minerName,
      mine_site_name: record.mine_site?.name ?? record.origin_mine_site,
      extraction_date: record.extraction_date?.toISOString() ?? null,
      weight_grams: record.weight_grams ? Number(record.weight_grams) : null,
      estimated_purity: record.estimated_purity ? Number(record.estimated_purity) : null,
      gps_latitude: record.gps_latitude ? Number(record.gps_latitude) : null,
      gps_longitude: record.gps_longitude ? Number(record.gps_longitude) : null,
      country: record.country,
      locality: record.locality,
    },
    chain_of_custody: chain,
    combinations,
    weight_history: weightHistory,
  };
}

/** Generate a branded traceability PDF report. */
export async function generateTraceabilityPdf(recordId: string): Promise<{ buffer: Buffer; docCode: string }> {
  const preview = await buildTraceabilityPreview(recordId);
  const docCode = preview.doc_code;
  const now = new Date();

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: MARGIN,
      bufferPages: true,
      info: {
        Title: `Traceability Report - ${preview.record_number ?? preview.record_id.slice(0, 8)}`,
        Author: 'Metal Concentrators SA - Gold Trace',
        Subject: 'Gold Bar Traceability Report',
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve({ buffer: Buffer.concat(chunks), docCode }));
    doc.on('error', reject);

    // ─── Cover Page ───
    doc.moveDown(4);

    // Gold accent line
    doc.moveTo(MARGIN, doc.y).lineTo(PAGE_WIDTH - MARGIN, doc.y).lineWidth(3).stroke('#b45309');
    doc.moveDown(1.5);

    doc.fontSize(28).font('Helvetica-Bold').fillColor('#b45309').text('GOLD TRACE', { align: 'center' });
    doc.fontSize(12).font('Helvetica').fillColor('#666666').text('Traceability Report', { align: 'center' });
    doc.moveDown(2);

    doc.fillColor('black');
    doc.fontSize(FONT_SIZE_TITLE).font('Helvetica-Bold').text(
      preview.record_number ?? 'Unassigned Record',
      { align: 'center' },
    );
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica').text(preview.gold_type?.replace('_', ' ') ?? 'Gold', { align: 'center' });
    doc.moveDown(2);

    // Document code box
    const boxY = doc.y;
    doc.rect(MARGIN + 100, boxY, CONTENT_WIDTH - 200, 50).fill('#fef3c7');
    doc.fillColor('#78350f').fontSize(10).font('Helvetica-Bold').text('DOCUMENT CODE', MARGIN + 100, boxY + 8, { width: CONTENT_WIDTH - 200, align: 'center' });
    doc.fontSize(14).font('Courier-Bold').text(docCode, MARGIN + 100, boxY + 24, { width: CONTENT_WIDTH - 200, align: 'center' });
    doc.fillColor('black');
    doc.y = boxY + 60;

    doc.moveDown(2);
    doc.fontSize(FONT_SIZE_BODY).font('Helvetica').text(`Generated: ${now.toLocaleDateString('en-ZA')} at ${now.toLocaleTimeString('en-ZA')}`, { align: 'center' });
    doc.moveDown(0.5);
    doc.text('Metal Concentrators SA', { align: 'center' });
    doc.text('Gold Trace Platform', { align: 'center' });

    doc.moveDown(4);
    doc.moveTo(MARGIN, doc.y).lineTo(PAGE_WIDTH - MARGIN, doc.y).lineWidth(3).stroke('#b45309');
    doc.lineWidth(1);
    doc.moveDown(1);
    doc.fontSize(FONT_SIZE_SMALL).fillColor('red').text('CONFIDENTIAL', { align: 'center' });
    doc.fillColor('#666666').text('This document provides chain-of-custody traceability for artisanal gold.', { align: 'center' });
    doc.fillColor('black');

    // ─── Section 1: Bar Identification ───
    doc.addPage();
    addSectionHeading(doc, '1. Bar Identification');
    addField(doc, 'Record Number', preview.record_number);
    addField(doc, 'Document Code', docCode);
    addField(doc, 'Gold Type', preview.gold_type?.replace('_', ' ') ?? null);
    addField(doc, 'Current Status', preview.current_status);
    addField(doc, 'Created', new Date(preview.chain_of_custody[0]?.timestamp ?? '').toLocaleDateString('en-ZA'));

    // ─── Section 2: Origination ───
    doc.moveDown(1);
    checkPageBreak(doc);
    addSectionHeading(doc, '2. Origination');
    addField(doc, 'Miner', preview.origin.miner_name);
    addField(doc, 'Mine Site', preview.origin.mine_site_name);
    addField(doc, 'Extraction Date', preview.origin.extraction_date ? new Date(preview.origin.extraction_date).toLocaleDateString('en-ZA') : null);
    addField(doc, 'Initial Weight', preview.origin.weight_grams ? `${preview.origin.weight_grams}g` : null);
    addField(doc, 'Estimated Purity', preview.origin.estimated_purity ? `${preview.origin.estimated_purity}%` : null);
    if (preview.origin.gps_latitude != null && preview.origin.gps_longitude != null) {
      addField(doc, 'GPS Coordinates', `${preview.origin.gps_latitude.toFixed(6)}, ${preview.origin.gps_longitude.toFixed(6)}`);
    }
    addField(doc, 'Country', preview.origin.country);
    addField(doc, 'Locality', preview.origin.locality);

    // ─── Section 3: Chain of Custody ───
    doc.moveDown(1);
    checkPageBreak(doc);
    addSectionHeading(doc, '3. Chain of Custody');

    for (const step of preview.chain_of_custody) {
      checkPageBreak(doc, 80);

      // Step header with gold accent
      const stepLabel = step.action === 'ORIGIN' ? 'ORIGIN' : `STEP ${step.step_number}`;
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#b45309').text(`${stepLabel}: ${step.actor_name}`);
      doc.fillColor('black').font('Helvetica').fontSize(FONT_SIZE_BODY);

      addField(doc, 'Role', step.actor_role);
      addField(doc, 'Action', step.action === 'ORIGIN' ? 'Extracted / Created Record' : 'Received Material');
      addField(doc, 'Weight', step.weight_grams ? `${step.weight_grams}g` : null);
      if (step.purity_au != null) {
        addField(doc, 'Au Purity', `${step.purity_au.toFixed(2)}%`);
      }
      if (step.gps_latitude != null && step.gps_longitude != null) {
        addField(doc, 'GPS', `${step.gps_latitude.toFixed(6)}, ${step.gps_longitude.toFixed(6)}`);
      }
      if (step.country) {
        addField(doc, 'Location', step.locality ? `${step.locality}, ${step.country}` : step.country);
      }
      addField(doc, 'Date', new Date(step.timestamp).toLocaleDateString('en-ZA'));
      doc.moveDown(0.5);

      // Divider between steps
      if (step.step_number < preview.chain_of_custody.length - 1) {
        doc.moveTo(MARGIN + 20, doc.y).lineTo(PAGE_WIDTH - MARGIN - 20, doc.y).stroke('#e5e7eb');
        doc.moveDown(0.3);
      }
    }

    // ─── Section 4: Weight Tracking ───
    doc.moveDown(1);
    checkPageBreak(doc);
    addSectionHeading(doc, '4. Weight Tracking');

    if (preview.weight_history.length === 0) {
      doc.text('No weight data available.');
    } else {
      // Table header
      const colWidths = [150, 80, 130, 130];
      const tableX = MARGIN;
      let tableY = doc.y;

      doc.font('Helvetica-Bold').fontSize(FONT_SIZE_SMALL);
      doc.text('Stage', tableX, tableY, { width: colWidths[0] });
      doc.text('Weight', tableX + colWidths[0], tableY, { width: colWidths[1] });
      doc.text('Actor', tableX + colWidths[0] + colWidths[1], tableY, { width: colWidths[2] });
      doc.text('Date', tableX + colWidths[0] + colWidths[1] + colWidths[2], tableY, { width: colWidths[3] });
      tableY += 14;
      doc.moveTo(tableX, tableY).lineTo(PAGE_WIDTH - MARGIN, tableY).stroke('#cccccc');
      tableY += 4;

      doc.font('Helvetica').fontSize(FONT_SIZE_SMALL);
      for (const entry of preview.weight_history) {
        checkPageBreak(doc, 20);
        tableY = doc.y;
        doc.text(entry.stage, tableX, tableY, { width: colWidths[0] });
        doc.text(entry.weight_grams ? `${entry.weight_grams}g` : '—', tableX + colWidths[0], tableY, { width: colWidths[1] });
        doc.text(entry.actor, tableX + colWidths[0] + colWidths[1], tableY, { width: colWidths[2] });
        doc.text(new Date(entry.timestamp).toLocaleDateString('en-ZA'), tableX + colWidths[0] + colWidths[1] + colWidths[2], tableY, { width: colWidths[3] });
        doc.moveDown(0.3);
      }
    }

    doc.fontSize(FONT_SIZE_BODY);

    // ─── Section 5: Material Combinations ───
    if (preview.combinations.length > 0) {
      doc.moveDown(1);
      checkPageBreak(doc);
      addSectionHeading(doc, '5. Material Combinations');

      for (const combo of preview.combinations) {
        checkPageBreak(doc, 60);
        addField(doc, 'Purchased By', combo.trader_name);
        addField(doc, 'Purchase Date', new Date(combo.purchased_at).toLocaleDateString('en-ZA'));
        addField(doc, 'Combined Weight', `${combo.total_weight}g`);

        if (combo.other_records.length > 0) {
          doc.font('Helvetica-Bold').text('Other records in this purchase:');
          doc.font('Helvetica');
          for (const other of combo.other_records) {
            doc.text(`  • ${other.record_number ?? 'Unassigned'} — ${other.weight_grams ? `${other.weight_grams}g` : 'N/A'}`);
          }
        } else {
          doc.text('This was the only record in the purchase.');
        }
        doc.moveDown(0.5);
      }
    }

    // ─── Section 6: Geographical Journey ───
    doc.moveDown(1);
    checkPageBreak(doc);
    const sectionNum = preview.combinations.length > 0 ? 6 : 5;
    addSectionHeading(doc, `${sectionNum}. Geographical Journey`);

    const geoSteps = preview.chain_of_custody.filter((s) => s.gps_latitude != null || s.country);
    if (geoSteps.length === 0) {
      doc.text('No geographical data recorded.');
    } else {
      for (const step of geoSteps) {
        checkPageBreak(doc, 30);
        const stepLabel = step.action === 'ORIGIN' ? 'Origin' : `Step ${step.step_number}`;
        const location = step.locality ? `${step.locality}, ${step.country}` : (step.country ?? '');
        const gps = step.gps_latitude != null ? `(${step.gps_latitude.toFixed(6)}, ${step.gps_longitude!.toFixed(6)})` : '';
        doc.text(`${stepLabel}: ${step.actor_name} (${step.actor_role}) — ${location} ${gps}`);
      }
    }

    // ─── Footer on each page ───
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);

      // Gold accent line at bottom
      doc.moveTo(MARGIN, doc.page.height - MARGIN - 5).lineTo(PAGE_WIDTH - MARGIN, doc.page.height - MARGIN - 5).lineWidth(1).stroke('#b45309');

      doc.fontSize(FONT_SIZE_SMALL).font('Helvetica').fillColor('#666666');
      doc.text(
        `${docCode} | Page ${i + 1} of ${pages.count} | Generated by ASM Gold Trace`,
        MARGIN,
        doc.page.height - MARGIN + 2,
        { width: CONTENT_WIDTH, align: 'center' },
      );
    }

    doc.fillColor('black');
    doc.end();
  });
}
