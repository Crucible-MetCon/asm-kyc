import PDFDocument from 'pdfkit';
import { prisma } from '@asm-kyc/database';
import { evaluateRisk, SURVEY_DEFINITIONS, getSurveyBySlug } from '@asm-kyc/shared';

const FONT_SIZE_TITLE = 20;
const FONT_SIZE_HEADING = 14;
const FONT_SIZE_BODY = 10;
const FONT_SIZE_SMALL = 8;
const MARGIN = 50;
const PAGE_WIDTH = 595.28; // A4
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

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

export async function generateEntityPack(userId: string): Promise<Buffer> {
  // Fetch all user data
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      miner_profile: true,
      mine_sites: true,
      records: {
        orderBy: { created_at: 'desc' },
        take: 50,
        include: {
          compliance_reviews: {
            include: { reviewer: { include: { miner_profile: true } } },
          },
        },
      },
      purchases: {
        orderBy: { purchased_at: 'desc' },
        take: 20,
        include: { trader: { include: { miner_profile: true } } },
      },
      sales_partners_as_miner: {
        include: { partner: { include: { miner_profile: true } } },
      },
      survey_responses: {
        include: {
          survey: true,
          answers: true,
          reward: true,
        },
      },
    },
  });

  if (!user) throw new Error('User not found');

  const profile = user.miner_profile;
  const now = new Date();

  // Build risk assessment
  const answersBySlug: Record<string, Record<string, unknown>> = {};
  for (const resp of user.survey_responses) {
    const slugAnswers: Record<string, unknown> = {};
    for (const a of resp.answers) {
      slugAnswers[a.question_id] = a.answer;
    }
    answersBySlug[resp.survey.slug] = slugAnswers;
  }
  const risk = evaluateRisk(answersBySlug);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: MARGIN,
      bufferPages: true,
      info: {
        Title: `Entity Pack - ${profile?.full_name ?? user.username}`,
        Author: 'Metal Concentrators SA - Gold Trace',
        Subject: 'Due Diligence Entity Pack',
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ─── Cover Page ───
    doc.moveDown(6);
    doc.fontSize(24).font('Helvetica-Bold').text('Entity Due Diligence Pack', { align: 'center' });
    doc.moveDown(1);
    doc.fontSize(14).font('Helvetica').text('Metal Concentrators SA', { align: 'center' });
    doc.text('Gold Trace Platform', { align: 'center' });
    doc.moveDown(2);
    doc.fontSize(16).font('Helvetica-Bold').text(profile?.full_name ?? user.username, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica').text(`Generated: ${now.toLocaleDateString('en-ZA')}`, { align: 'center' });
    doc.moveDown(3);
    doc.fontSize(10).fillColor('red').text('CONFIDENTIAL', { align: 'center' });
    doc.fillColor('black');
    doc.fontSize(FONT_SIZE_SMALL).text(
      'This document contains sensitive personal and business information.',
      { align: 'center' },
    );
    doc.text('Unauthorised distribution is prohibited.', { align: 'center' });

    // ─── Section 1: Identity ───
    doc.addPage();
    addSectionHeading(doc, '1. Identity Information');
    addField(doc, 'Full Name', profile?.full_name ?? null);
    addField(doc, 'Username', user.username);
    addField(doc, 'Phone', user.phone_e164);
    addField(doc, 'Role', user.role);
    addField(doc, 'NRC Number', profile?.nrc_number ?? null);
    addField(doc, 'Date of Birth', profile?.date_of_birth?.toLocaleDateString('en-ZA') ?? null);
    addField(doc, 'Gender', profile?.gender ?? null);
    addField(doc, 'Counterparty Type', profile?.counterparty_type ?? null);
    addField(doc, 'Account Created', user.created_at.toLocaleDateString('en-ZA'));
    addField(doc, 'Profile Completed', profile?.profile_completed_at?.toLocaleDateString('en-ZA') ?? 'Not completed');

    // ─── Section 2: Mine Sites ───
    doc.moveDown(1);
    checkPageBreak(doc);
    addSectionHeading(doc, '2. Mine Sites');

    if (user.mine_sites.length === 0) {
      doc.text('No mine sites registered.');
    } else {
      for (const site of user.mine_sites) {
        checkPageBreak(doc, 60);
        addField(doc, 'Name', site.name);
        addField(doc, 'GPS', site.gps_latitude && site.gps_longitude
          ? `${Number(site.gps_latitude).toFixed(6)}, ${Number(site.gps_longitude).toFixed(6)}`
          : null);
        addField(doc, 'Mining Licence', site.mining_license_number);
        addField(doc, 'Default Site', site.is_default ? 'Yes' : 'No');
        doc.moveDown(0.5);
      }
    }

    // ─── Section 3: Survey Responses ───
    doc.moveDown(1);
    checkPageBreak(doc);
    addSectionHeading(doc, '3. Survey Responses');

    if (user.survey_responses.length === 0) {
      doc.text('No surveys completed.');
    } else {
      for (const resp of user.survey_responses) {
        checkPageBreak(doc, 80);
        const surveyDef = getSurveyBySlug(resp.survey.slug);
        doc.font('Helvetica-Bold').fontSize(11).text(
          surveyDef?.i18nTitleKey.replace('surveys.', '').replace('.title', '') ?? resp.survey.slug,
        );
        doc.font('Helvetica').fontSize(FONT_SIZE_BODY);
        addField(doc, 'Completed', resp.completed_at.toLocaleDateString('en-ZA'));
        doc.moveDown(0.3);

        for (const answer of resp.answers) {
          checkPageBreak(doc, 30);
          const questionDef = surveyDef?.questions.find((q) => q.id === answer.question_id);
          const label = questionDef?.id ?? answer.question_id;
          const value = Array.isArray(answer.answer)
            ? (answer.answer as string[]).join(', ')
            : String(answer.answer);
          addField(doc, label, value);
        }
        doc.moveDown(0.5);
      }
    }

    // ─── Section 4: Risk Assessment ───
    doc.moveDown(1);
    checkPageBreak(doc);
    addSectionHeading(doc, '4. Risk Assessment');

    addField(doc, 'Overall Risk Level', risk.level);
    doc.moveDown(0.3);

    if (risk.flags.length === 0) {
      doc.text('No risk flags triggered.');
    } else {
      doc.font('Helvetica-Bold').text('Triggered Flags:');
      doc.font('Helvetica');
      for (const flag of risk.flags) {
        checkPageBreak(doc, 20);
        const severity = flag.severity === 'CRITICAL' ? '!!! CRITICAL'
          : flag.severity === 'HIGH' ? '!! HIGH'
          : '! MEDIUM';
        doc.text(`  [${severity}] ${flag.labelKey} (${flag.surveySlug} / ${flag.questionId})`);
      }
    }

    // ─── Section 5: Consent Record ───
    doc.moveDown(1);
    checkPageBreak(doc);
    addSectionHeading(doc, '5. Consent Record');

    addField(doc, 'Consent Version', profile?.consent_version ?? null);
    addField(doc, 'Consented Date', profile?.consented_at?.toLocaleDateString('en-ZA') ?? null);

    // ─── Section 6: Gold Records ───
    doc.moveDown(1);
    checkPageBreak(doc);
    addSectionHeading(doc, '6. Gold Records');

    if (user.records.length === 0) {
      doc.text('No gold records.');
    } else {
      doc.text(`Total records: ${user.records.length}`);
      doc.moveDown(0.3);

      for (const record of user.records.slice(0, 20)) {
        checkPageBreak(doc, 40);
        const weight = record.weight_grams ? `${Number(record.weight_grams)}g` : 'N/A';
        doc.text(
          `${record.record_number ?? 'DRAFT'} | ${weight} | ${record.gold_type ?? 'N/A'} | ${record.status} | ${record.created_at.toLocaleDateString('en-ZA')}`,
        );
      }

      if (user.records.length > 20) {
        doc.moveDown(0.3);
        doc.font('Helvetica-Oblique').text(`...and ${user.records.length - 20} more records`);
        doc.font('Helvetica');
      }
    }

    // ─── Section 7: Purchase History ───
    doc.moveDown(1);
    checkPageBreak(doc);
    addSectionHeading(doc, '7. Purchase History');

    // Find purchases where this miner's records were bought
    if (user.records.length > 0) {
      const purchasedRecords = user.records.filter((r) => r.purchased_by && r.purchased_at);
      if (purchasedRecords.length === 0) {
        doc.text('No records have been purchased.');
      } else {
        for (const record of purchasedRecords.slice(0, 20)) {
          checkPageBreak(doc, 20);
          doc.text(
            `${record.record_number ?? record.id.slice(0, 8)} | Purchased ${record.purchased_at?.toLocaleDateString('en-ZA')}`,
          );
        }
      }
    } else {
      doc.text('No records to show purchase history.');
    }

    // ─── Section 8: Compliance Reviews ───
    doc.moveDown(1);
    checkPageBreak(doc);
    addSectionHeading(doc, '8. Compliance Reviews');

    const allReviews = user.records.flatMap((r) => r.compliance_reviews);
    if (allReviews.length === 0) {
      doc.text('No compliance reviews.');
    } else {
      for (const review of allReviews.slice(0, 20)) {
        checkPageBreak(doc, 30);
        const reviewerName = review.reviewer.miner_profile?.full_name ?? review.reviewer.username;
        doc.text(
          `${review.status} | ${reviewerName} | ${review.reviewed_at.toLocaleDateString('en-ZA')}`,
        );
        if (review.notes) {
          doc.font('Helvetica-Oblique').text(`  Notes: ${review.notes}`);
          doc.font('Helvetica');
        }
      }
    }

    // ─── Section 9: Sales Partners ───
    doc.moveDown(1);
    checkPageBreak(doc);
    addSectionHeading(doc, '9. Sales Partners');

    if (user.sales_partners_as_miner.length === 0) {
      doc.text('No sales partners registered.');
    } else {
      for (const sp of user.sales_partners_as_miner) {
        checkPageBreak(doc, 20);
        const partnerName = sp.partner.miner_profile?.full_name ?? sp.partner.username;
        doc.text(`${partnerName} (${sp.partner.role}) — since ${sp.created_at.toLocaleDateString('en-ZA')}`);
      }
    }

    // ─── Footer on each page ───
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(FONT_SIZE_SMALL).font('Helvetica');
      doc.text(
        `Page ${i + 1} of ${pages.count} | Generated ${now.toISOString()} | CONFIDENTIAL`,
        MARGIN,
        doc.page.height - MARGIN + 10,
        { width: CONTENT_WIDTH, align: 'center' },
      );
    }

    doc.end();
  });
}
