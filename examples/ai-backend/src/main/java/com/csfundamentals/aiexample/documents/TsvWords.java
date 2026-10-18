package com.csfundamentals.aiexample.documents;

import java.util.ArrayList;
import java.util.List;

final class TsvWords {
    static DocumentReport.Page parse(String tsv, int page) throws DocumentFailure {
        String[] rows = tsv.split("\\R", -1);
        if (rows.length == 0 || !rows[0].equals("level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext")) throw new DocumentFailure(DocumentFailure.Code.INVALID_OCR_OUTPUT);
        List<DocumentReport.Word> words = new ArrayList<>(); StringBuilder text = new StringBuilder(); String previous = ""; int line = 0;
        try {
            for (int row = 1; row < rows.length; row++) {
                if (rows[row].isBlank()) continue;
                String[] values = rows[row].split("\t", 12);
                if (values.length != 12) throw new IllegalArgumentException();
                if (!values[0].equals("5") || values[11].isBlank()) continue;
                if (words.size() >= 512 || values[11].length() > 128) throw new DocumentFailure(DocumentFailure.Code.TEXT_LIMIT);
                String identity = values[2] + ":" + values[3] + ":" + values[4];
                if (!identity.equals(previous)) { if (!text.isEmpty()) text.append('\n'); line++; previous = identity; }
                else text.append(' ');
                String word = values[11].strip(); text.append(word);
                double confidence = Double.parseDouble(values[10]);
                if (!Double.isFinite(confidence) || confidence < -1 || confidence > 100) throw new IllegalArgumentException();
                int left = Integer.parseInt(values[6]), top = Integer.parseInt(values[7]), width = Integer.parseInt(values[8]), height = Integer.parseInt(values[9]);
                if (left < 0 || top < 0 || width < 0 || height < 0) throw new IllegalArgumentException();
                words.add(new DocumentReport.Word(word, confidence < 0 ? null : confidence, left, top, width, height, line));
                if (text.length() > DocumentWorker.PAGE_TEXT_LIMIT) throw new DocumentFailure(DocumentFailure.Code.TEXT_LIMIT);
            }
        } catch (IllegalArgumentException malformed) { throw new DocumentFailure(DocumentFailure.Code.INVALID_OCR_OUTPUT); }
        return new DocumentReport.Page(page, "OCR", text.toString(), List.copyOf(words));
    }
}
