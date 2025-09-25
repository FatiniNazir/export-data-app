public with sharing class ImportController {
    @AuraEnabled
    public static Integer uploadCSV(String csvData, String objectApiName){
        try {
            if (String.isBlank(csvData)) {
                throw new AuraHandledException('CSV data is empty.');
            }

            List<String> lines = csvData.split('\n');
            if (lines.isEmpty()) {
                throw new AuraHandledException('No rows found in CSV file.');
            }

            // Parse headers (first row)
            List<String> headers = parseCsvLine(lines[0]);
            if (headers.isEmpty()) {
                throw new AuraHandledException('No headers found in CSV file.');
            }

            // Validate object
            Map<String, Schema.SObjectType> gd = Schema.getGlobalDescribe();
            if (!gd.containsKey(objectApiName)) {
                throw new AuraHandledException('Object not found: ' + objectApiName);
            }

            Schema.SObjectType sType = gd.get(objectApiName);
            Map<String, Schema.SObjectField> fieldMap = sType.getDescribe().fields.getMap();

            // Build label -> API name map
            Map<String, String> labelToApi = new Map<String, String>();
            for (String apiName : fieldMap.keySet()) {
                Schema.DescribeFieldResult dfr = fieldMap.get(apiName).getDescribe();
                labelToApi.put(dfr.getLabel().toLowerCase(), apiName);
            }

            List<SObject> records = new List<SObject>();

            // Loop through data rows
            for (Integer i = 1; i < lines.size(); i++) {
                if (String.isBlank(lines[i])) continue;

                List<String> values = parseCsvLine(lines[i]);
                SObject rec = sType.newSObject();

                for (Integer j = 0; j < headers.size(); j++) {
                    String headerLabel = headers[j].trim().toLowerCase();
                    if (labelToApi.containsKey(headerLabel) && j < values.size()) {
                        String apiName = labelToApi.get(headerLabel);
                        String val = values[j].trim();
                        rec.put(apiName, val);
                    }
                }
                records.add(rec);
            }

            if (records.isEmpty()) {
                throw new AuraHandledException('No valid records found to insert.');
            }

            insert records;
            return records.size();

        } catch (DmlException dmlEx) {
            throw new AuraHandledException('DML error while inserting records: ' + dmlEx.getDmlMessage(0));
        } catch (Exception ex) {
            throw new AuraHandledException('Unexpected error: ' + ex.getMessage());
        }
    }

    // --- CSV-safe parser (handles quotes and commas inside quotes) ---
    private static List<String> parseCsvLine(String line) {
        List<String> result = new List<String>();
        Boolean inQuotes = false;
        String current = '';

        for (Integer i = 0; i < line.length(); i++) {
            String c = line.substring(i, i+1);

            if (c == '"') {
                // Handle double quotes inside quoted field
                if (inQuotes && i+1 < line.length() && line.substring(i+1, i+2) == '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (c == ',' && !inQuotes) {
                // End of field
                result.add(current);
                current = '';
            } else {
                current += c;
            }
        }
        result.add(current);

        return result;
    }
}
