public with sharing class MetadataServiceUtil {
    public static MetadataService.MetadataPort createService() {
        MetadataService.MetadataPort service = new MetadataService.MetadataPort();

        // Use the Named Credential directly in the endpoint
        // Format: callout:<NamedCredentialName>
        service.endpoint_x = 'callout:MetadataAPI/services/Soap/m/64.0';
        
        // SessionHeader is automatically handled by Named Credential OAuth
        // No need to manually set sessionId
        return service;
    }
}
