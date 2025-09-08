package com.realestate.service;

import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.util.Map;

@Service
public class ReportService {

    public byte[] buildAnalyticsPdf(Map<String, Object> summary) {
        try {
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            Document document = new Document();
            PdfWriter.getInstance(document, baos);
            document.open();

            Font titleFont = new Font(Font.HELVETICA, 18, Font.BOLD);
            Font normalFont = new Font(Font.HELVETICA, 12, Font.NORMAL);

            Paragraph title = new Paragraph("Business Analytics Summary", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(12f);
            document.add(title);

            Paragraph info = new Paragraph("Auto-generated report with key KPIs.", normalFont);
            info.setSpacingAfter(10f);
            document.add(info);

            PdfPTable table = new PdfPTable(2);
            table.setWidthPercentage(100);

            addRow(table, "Total Properties", String.valueOf(summary.getOrDefault("totalProperties", 0)));
            addRow(table, "Total Inquiries", String.valueOf(summary.getOrDefault("totalInquiries", 0)));
            addRow(table, "Active", String.valueOf(summary.getOrDefault("active", 0)));
            addRow(table, "Negotiating", String.valueOf(summary.getOrDefault("negotiating", 0)));
            addRow(table, "Agreed", String.valueOf(summary.getOrDefault("agreed", 0)));
            addRow(table, "Purchased", String.valueOf(summary.getOrDefault("purchased", 0)));
            addRow(table, "Revenue", String.valueOf(summary.getOrDefault("revenue", 0)));

            document.add(table);

            document.close();
            return baos.toByteArray();
        } catch (DocumentException e) {
            throw new RuntimeException("Failed to generate PDF: " + e.getMessage(), e);
        }
    }

    private void addRow(PdfPTable table, String key, String value) {
        PdfPCell c1 = new PdfPCell(new Phrase(key));
        PdfPCell c2 = new PdfPCell(new Phrase(value));
        table.addCell(c1);
        table.addCell(c2);
    }
}
