import { LightningElement, wire } from 'lwc';
import getAllEmployees from '@salesforce/apex/ExportController.getAllEmployees';
import getAllAccounts from '@salesforce/apex/ExportController.getAllAccounts';
import SHEETJS from '@salesforce/resourceUrl/xlsx'; 
import { loadScript } from 'lightning/platformResourceLoader';  

export default class ExportToExcel extends LightningElement {
    empList = [];
    accList = [];
    sheetJsInitialized = false;

    // Column definitions for Employee datatable
    empColumns = [
        { label: 'Name', fieldName: 'Name' },
        { label: 'Email', fieldName: 'Email__c' },
        { label: 'Role', fieldName: 'Role__c' }
    ];

    // Column definitions for Account datatable
    accColumns = [
        { label: 'Name', fieldName: 'Name' },
        { label: 'Industry', fieldName: 'Industry' },
        { label: 'Phone', fieldName: 'Phone' }
    ];

    @wire(getAllEmployees) 
    wiredEmplist({ error, data }) {
        if (data) {
            this.empList = data;
        } else if (error) { 
            console.error('Error fetching employees:', error);
        }
    }

    @wire(getAllAccounts)
    wiredAccList({ error, data }) {
        if (data) {
            this.accList = data;
        } else if (error) {
            console.error('Error fetching accounts:', error);
        }
    }

    renderedCallback() {
        if (this.sheetJsInitialized) {
            return;
        }
        this.sheetJsInitialized = true;

        loadScript(this, SHEETJS)
            .then(() => {
                console.log('SheetJS loaded successfully');
            })
            .catch(error => {
                console.error('Error loading SheetJS', error);
            });
    }

    handleExport() {
        if (!this.empList.length && !this.accList.length) {
            alert('No data available to export');
            return;
        }

        let wb = XLSX.utils.book_new();

        //Transform Employee Data with friendly headers
        if (this.empList.length > 0) {
            let empData = this.empList.map(emp => ({
                Name: emp.Name,
                Email: emp.Email__c,
                Role: emp.Role__c
            }));
            let empSheet = XLSX.utils.json_to_sheet(empData);
            XLSX.utils.book_append_sheet(wb, empSheet, 'Employees');
        }

        //Transform Account Data with friendly headers
        if (this.accList.length > 0) {
            let accData = this.accList.map(acc => ({
                Name: acc.Name,
                Industry: acc.Industry,
                Phone: acc.Phone
            }));
            let accSheet = XLSX.utils.json_to_sheet(accData);
            XLSX.utils.book_append_sheet(wb, accSheet, 'Accounts');
        }

        XLSX.writeFile(wb, 'ExportedData.xlsx');
    }
}
