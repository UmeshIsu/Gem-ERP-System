import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import * as ExcelJS from 'exceljs';
import PDFDocument = require('pdfkit');

export interface TabularReport {
  title: string;
  subtitle?: string;
  columns: { key: string; header: string; width?: number; money?: boolean }[];
  rows: Record<string, unknown>[];
  totals?: Record<string, number>;
}

const fmtCell = (v: unknown): string => {
  if (v == null) return '—';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'number') return v.toLocaleString('en-US', { maximumFractionDigits: 2 });
  return String(v);
};

@Injectable()
export class ReportExportService {
  sendCsv(res: Response, report: TabularReport) {
    const esc = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
    const lines = [
      report.columns.map((c) => esc(c.header)).join(','),
      ...report.rows.map((r) => report.columns.map((c) => esc(fmtCell(r[c.key]))).join(',')),
    ];
    const filename = `${report.title.toLowerCase().replace(/\s+/g, '-')}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('﻿' + lines.join('\n'));
  }

  async sendExcel(res: Response, report: TabularReport) {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'AURA GEM ERP';
    const ws = wb.addWorksheet(report.title.slice(0, 31));

    ws.addRow([report.title]).font = { bold: true, size: 14 };
    if (report.subtitle) ws.addRow([report.subtitle]).font = { size: 10, color: { argb: 'FF6B7280' } };
    ws.addRow([]);

    const headerRow = ws.addRow(report.columns.map((c) => c.header));
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
      cell.border = { bottom: { style: 'thin' } };
    });

    for (const r of report.rows) {
      ws.addRow(report.columns.map((c) => {
        const v = r[c.key];
        return v instanceof Date ? v.toISOString().slice(0, 10) : (v as ExcelJS.CellValue) ?? '—';
      }));
    }

    if (report.totals) {
      const totalRow = ws.addRow(report.columns.map((c) => report.totals![c.key] ?? (c === report.columns[0] ? 'TOTAL' : '')));
      totalRow.font = { bold: true };
    }

    report.columns.forEach((c, i) => {
      const col = ws.getColumn(i + 1);
      col.width = c.width ?? 18;
      if (c.money) col.numFmt = '#,##0.00';
    });

    const filename = `${report.title.toLowerCase().replace(/\s+/g, '-')}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await wb.xlsx.write(res);
    res.end();
  }

  sendPdf(res: Response, report: TabularReport) {
    const filename = `${report.title.toLowerCase().replace(/\s+/g, '-')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: report.columns.length > 6 ? 'landscape' : 'portrait' });
    doc.pipe(res);

    doc.fontSize(18).fillColor('#1E3A5F').text('AURA GEM ERP', { continued: false });
    doc.fontSize(14).fillColor('#111827').text(report.title);
    if (report.subtitle) doc.fontSize(9).fillColor('#6B7280').text(report.subtitle);
    doc.moveDown(0.8);

    const pageWidth = doc.page.width - 80;
    const totalWeight = report.columns.reduce((s, c) => s + (c.width ?? 18), 0);
    const colWidths = report.columns.map((c) => ((c.width ?? 18) / totalWeight) * pageWidth);
    const rowHeight = 18;
    let y = doc.y;

    const drawHeader = () => {
      doc.rect(40, y, pageWidth, rowHeight).fill('#1E3A5F');
      let x = 40;
      doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold');
      report.columns.forEach((c, i) => {
        doc.text(c.header, x + 4, y + 5, { width: colWidths[i] - 8, ellipsis: true });
        x += colWidths[i];
      });
      y += rowHeight;
      doc.font('Helvetica');
    };

    drawHeader();
    for (const [idx, r] of report.rows.entries()) {
      if (y > doc.page.height - 60) {
        doc.addPage();
        y = 40;
        drawHeader();
      }
      if (idx % 2 === 1) doc.rect(40, y, pageWidth, rowHeight).fill('#F3F6FA');
      let x = 40;
      doc.fillColor('#111827').fontSize(8);
      report.columns.forEach((c, i) => {
        doc.text(fmtCell(r[c.key]), x + 4, y + 5, { width: colWidths[i] - 8, ellipsis: true });
        x += colWidths[i];
      });
      y += rowHeight;
    }

    doc.moveDown(2);
    doc.fontSize(7).fillColor('#9CA3AF').text(`Generated ${new Date().toISOString()} · AURA GEM ERP`, 40, doc.page.height - 50);
    doc.end();
  }
}
