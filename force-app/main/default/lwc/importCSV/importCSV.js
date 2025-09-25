import { LightningElement, track } from 'lwc';
import processCSV from '@salesforce/apex/FileImportController.processCSV';

export default class ImportCSV extends LightningElement {
    @track message = '';
    @track headers = [];
    @track previewData = [];
    fileContent;

    handleFileChange(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                this.fileContent = reader.result;

                // Split lines
                const lines = this.fileContent.split('\n').map(l => l.trim()).filter(l => l);
                this.headers = lines[0].split(',').map(h => h.trim());

                // Preview first 5 rows
                this.previewData = lines.slice(1, 6).map((line, rowIndex) => {
                    const values = line.split(',').map(v => v.trim());
                    return {
                        key: 'row_' + rowIndex,
                        values: values.map((val, colIndex) => {
                            return { key: 'cell_' + rowIndex + '_' + colIndex, value: val };
                        })
                    };
                });

                this.message = 'File is uploaded. Preview below ⬇';
            };
            reader.readAsText(file);
        }
    }

    uploadFile() {
        if (!this.fileContent) {
            this.message = 'Please select a file first';
            return;
        }

        processCSV({
            csvData: this.fileContent,
            objectApiName: 'Project__c',
            headers: this.headers
        })
        .then(result => {
            this.message = result;
        })
        .catch(error => {
            this.message = 'Error: ' + error.body.message;
        });
    }
}
