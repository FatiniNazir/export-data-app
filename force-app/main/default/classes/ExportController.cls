public with sharing class ExportController {
    @AuraEnabled(cacheable = true)
    public static List<Employee__c> getAllEmployees(){
        List<Employee__c> empList = [
            SELECT Id, Name, Email__c, Role__c
            FROM Employee__c
            LIMIT 100
        ];
        return empList;
    }

    @AuraEnabled(cacheable = true)
    public static List<Account> getAllAccounts(){
        List<Account> accList=[
            SELECT Id, Name, Industry, Phone
            FROM Account
            LIMIT 100
        ];
        return accList;
    }

}