public with sharing class FileImportController {
    @AuraEnabled
    public static String processCSV(String csvData, String objectApiName, List<String> headers) {
    try {
        // Step 1: Get object describe
        Map<String, Schema.SObjectType> gd = Schema.getGlobalDescribe();
        if (!gd.containsKey(objectApiName)) {
            throw new AuraHandledException('Object not found: ' + objectApiName);
        }

        Schema.SObjectType sType = gd.get(objectApiName);
        Map<String, Schema.SObjectField> fields = sType.getDescribe().fields.getMap();

        // Step 2: Create missing fields
        for (String header : headers) {
            String apiName = formatApiName(header);
            if (!fields.containsKey(apiName)) {
                createCustomField(objectApiName, apiName, header);
            }
        }

        // Step 3: Parse CSV rows
        List<String> lines = csvData.split('\n');
        if (lines.size() <= 1) return 'No data rows found';

        List<SObject> records = new List<SObject>();
        for (Integer i = 1; i < lines.size(); i++) {
            String line = lines[i].trim();
            if (line == '') continue;

            List<String> values = line.split(',');
            SObject record = sType.newSObject();

            for (Integer j = 0; j < headers.size(); j++) {
                String apiName = formatApiName(headers[j]);
                if (j < values.size()) {
                    try {
                        record.put(apiName, values[j].trim());
                    } catch (Exception ex) {
                        // If field was just created, it won't be available until cache refresh
                        System.debug('Field not yet available in schema: ' + apiName);
                    }
                }
            }
            records.add(record);
        }

        if (!records.isEmpty()) {
            Database.insert(records, false);
        }

        return 'Inserted ' + records.size() + 
               ' records. (New fields auto-created if missing)';
        } catch (Exception e) {
            return 'Error: ' + e.getMessage();
        }
    }

    // Format CSV column → Salesforce API field name
    private static String formatApiName(String header) {
        String sanitized = header.replaceAll('[^a-zA-Z0-9]', '_');
        if (!sanitized.endsWith('__c')) {
            sanitized += '__c';
        }
        return sanitized;
    }

    // Create a custom Text field (using apex-mdapi)
    private static void createCustomField(String objectApiName, String apiName, String label) {
        MetadataService.MetadataPort service = MetadataServiceUtil.createService();

        MetadataService.CustomField newField = new MetadataService.CustomField();
        newField.fullName = objectApiName + '.' + apiName;
        newField.label = label;
        newField.type_x = 'Text';
        newField.length = 255;

        MetadataService.SaveResult[] results = service.createMetadata(
            new MetadataService.Metadata[] { newField }
        );

        if (results != null && results.size() > 0) {
            MetadataService.SaveResult result = results[0];
            if (!result.success) {
                String errors = '';
                for (MetadataService.Error err : result.errors) {
                    errors += err.message + ' ';
                }
                throw new AuraHandledException('Failed to create field ' + apiName + ': ' + errors);
            }
        }
    }
}