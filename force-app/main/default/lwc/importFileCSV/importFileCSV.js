import { LightningElement, track } from 'lwc';
import uploadCSV from '@salesforce/apex/ImportController.uploadCSV';
import SHEETJS from '@salesforce/resourceUrl/xlsx'; 
import { loadScript } from 'lightning/platformResourceLoader';

export default class ImportFileCSV extends LightningElement {
    @track message = '';
    @track previewData = [];
    @track headers = [];
    fileContent;
    sheetJsInitialized = false;

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

    handleFileChange(event) {
        const file = event.target.files[0];
        if (!file) {
            this.message = 'No file selected';
            return;
        }

        //File size check (10MB)
        if (file.size > 10 * 1024 * 1024) {
            this.message = 'File is too large. Please upload a file smaller than 10MB.';
            return;
        }

        const reader = new FileReader();
        const fileName = file.name.toLowerCase();

        reader.onload = () => {
            let fileData;

            if (fileName.endsWith('.csv')) {
                fileData = reader.result;
                this.processWithSheetJS(fileData, file.name, 'csv');
            } else if (fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) {
                // Convert Excel → CSV using SheetJS
                this.processWithSheetJS(reader.result, file.name, 'excel');
            } else {
                this.message = 'Unsupported file type. Please upload CSV or Excel.';
                return;
            }
        };

        if (fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) {
            reader.readAsBinaryString(file);
        } else {
            reader.readAsText(file);
        }
    }

    processWithSheetJS(fileContent, fileName, type) {
        let workbook;
        if (type === 'csv') {
            workbook = XLSX.read(fileContent, { type: 'string' });
        } else {
            workbook = XLSX.read(fileContent, { type: 'binary' });
        }

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        //Parse into raw rows (array of arrays)
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length > 1) {
            this.headers = jsonData[0];

            //Limit to first 10 rows
            const limitedRows = jsonData.slice(1, 51);

            this.previewData = limitedRows.map((row, rowIndex) => {
                const cells = row.map((cell, cellIndex) => {
                    return {
                        cellId: `row-${rowIndex}-cell-${cellIndex}`,
                        value: cell
                    };
                });

                // Add an index column
                cells.unshift({
                    cellId: `row-${rowIndex}-index`,
                    value: rowIndex + 1
                });

                return {
                    rowId: `row-${rowIndex}`,
                    cells: cells
                };
            });

            // Prepend "Index" to headers
            this.headers = ['Index', ...this.headers];
        }

        // Save clean CSV (only first 50 rows) to send to Apex
        const limitedContent = XLSX.utils.sheet_to_csv(worksheet, { FS: ',' })
            .split('\n')
            .slice(0, 51) // header + 50 rows
            .join('\n');

        this.fileContent = limitedContent;
        this.message = `File "${fileName}" loaded successfully`;
    }

    uploadFile() {
        if (!this.fileContent) {
            this.message = 'Please select a file';
            return;
        }

        uploadCSV({ csvData: this.fileContent, objectApiName: 'Customer__c' })
        .then(count => {
            this.message = `File uploaded. Inserted ${count} records`;
        })
        .catch(error => {
            console.error('Upload error:', JSON.stringify(error)); // log full error
            let errorMessage = 'Unknown error';

            if (error && error.body) {
                if (Array.isArray(error.body)) {
                    errorMessage = error.body.map(e => e.message).join(', ');
                } else if (error.body.message) {
                    errorMessage = error.body.message;
                }
            } else if (error && error.message) {
                errorMessage = error.message;
            }

            this.message = `Error: ${errorMessage}`;
        });

    }
}
