import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { readBarcodes, type ReaderOptions } from 'zxing-wasm/reader'; // Correct import for ZXing

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'], // Corrected the plural form here
})
export class AppComponent implements OnInit {
  @ViewChild('video') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas') canvasElement!: ElementRef<HTMLCanvasElement>;

  private videoStream?: MediaStream;
  private decodingInterval?: any;
  public isDecoding = false;

  ngOnInit(): void {
    // this.scanBarcode();
  }

  text: string = '';
  licenseDetails: any = null;
  liveData: string = 'data here';
  imageData: string = 'image';

  async startDecoding() {
    try {
      // Access the camera
      // this.videoStream = await navigator.mediaDevices.getUserMedia({
      //   video: true,
      // });
      // this.videoElement.nativeElement.srcObject = this.videoStream;
      // this.isDecoding = true;

      // // Start processing frames
      // Check if the device is a mobile phone
      const isMobile = /iPhone|Android|iPad|iPod/i.test(navigator.userAgent);

      // Set constraints
      const constraints: MediaStreamConstraints = {
        video: isMobile
          ? { facingMode: { exact: 'environment' } } // Try to use back camera
          : true, // Default video constraints for other devices
      };

      // Request video stream
      this.videoStream = await navigator.mediaDevices.getUserMedia(constraints);

      // Set the video stream to the video element
      this.videoElement.nativeElement.srcObject = this.videoStream;
      this.processFrames();
    } catch (error) {
      console.error('Error accessing camera:', error);
    }
  }

  async processFrames() {
    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;
    const context = canvas.getContext('2d');

    if (!context) {
      console.error('Canvas context is not available.');
      return;
    }

    this.decodingInterval = setInterval(async () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw the current video frame onto the canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Extract the image data
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

      console.log(imageData);

      this.imageData = imageData.colorSpace;

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png')
      );

      if (!blob) {
        throw new Error('Failed to convert canvas to Blob');
      }

      // Create a File object from the Blob
      const file = new File([blob], 'frame.png', { type: 'image/png' });

      // Run your decoding logic
      const result = this.scanBarcode(file);

      console.log(result);

      // if (result.found) {
      //   console.log('Desired property found:', result.properties);
      //   this.stopDecoding();
      // }
    }, 100); // Adjust the interval as needed (e.g., 100ms)
  }

  stopDecoding() {
    if (this.videoStream) {
      this.videoStream.getTracks().forEach((track) => track.stop());
    }
    clearInterval(this.decodingInterval);
    this.isDecoding = false;
  }

  async scanBarcode(file?: any) {
    const readerOptions: ReaderOptions = {
      tryHarder: true,
      formats: ['PDF417'],
      maxNumberOfSymbols: 1,
      binarizer: 'LocalAverage',
      textMode: 'HRI',
      tryRotate: true,
      tryInvert: true,
      tryDenoise: true,
      tryDownscale: true,
      downscaleFactor: 3,
      downscaleThreshold: 500,
    };

    const imageFileReadResults: any = await readBarcodes(file, readerOptions);

    this.liveData = imageFileReadResults;

    if (imageFileReadResults[0]?.text) {
      this.text = imageFileReadResults[0]?.text;
      const result = this.parseAAMVA2(this.text);
      console.log(result);
      this.licenseDetails = JSON.stringify(result, null, 2);
    }

    console.log(imageFileReadResults);
  }

  onFileSelected(event: Event) {
    const inputElement = event.target as HTMLInputElement;

    if (inputElement.files && inputElement.files.length > 0) {
      const selectedFile = inputElement.files[0];
      console.log('File Selected:', selectedFile);

      this.scanBarcode(selectedFile);
    }
  }

  parseDLData(data: any) {
    const parsedData: any = {};

    const lines = data.split('\n');

    lines.forEach((line: any) => {
      if (line.startsWith('DAA')) parsedData['FullName'] = line.substring(3);
      else if (line.startsWith('DCS'))
        parsedData['LastName'] = line.substring(3);
      else if (line.startsWith('DAC'))
        parsedData['FirstName'] = line.substring(3);
      else if (line.startsWith('DAD'))
        parsedData['MiddleName'] = line.substring(3);
      else if (line.startsWith('DBB')) parsedData['DOB'] = line.substring(3);
      else if (line.startsWith('DBC')) parsedData['Gender'] = line.substring(3);
      else if (line.startsWith('DBA'))
        parsedData['LicenseExpirationDate'] = line.substring(3);
      else if (line.startsWith('DBD'))
        parsedData['IssueDate'] = line.substring(3);
      else if (line.startsWith('DAG'))
        parsedData['StreetAddress'] = line.substring(3);
      else if (line.startsWith('DAI')) parsedData['City'] = line.substring(3);
      else if (line.startsWith('DAJ')) parsedData['State'] = line.substring(3);
      else if (line.startsWith('DAK'))
        parsedData['PostalCode'] = line.substring(3);
      else if (line.startsWith('DCG'))
        parsedData['Country'] = line.substring(3);
      else if (line.startsWith('DAQ'))
        parsedData['LicenseNumber'] = line.substring(3);
      else if (line.includes('DAQ'))
        parsedData['LicenseNumber'] = line.substring(3);
      else if (line.startsWith('DAY'))
        parsedData['EyeColor'] = line.substring(3);
      else if (line.startsWith('DAZ'))
        parsedData['HairColor'] = line.substring(3);
      else if (line.startsWith('DAU')) parsedData['Height'] = line.substring(3);
      else if (line.startsWith('DAX')) parsedData['Weight'] = line.substring(3);

      // Add additional fields as needed
    });

    return parsedData;
  }

  parseAAMVA2(rawData: any) {
    const parsedData: any = {};

    const cleanData: any = rawData
      .replace(/<LF>/g, '\n')
      .replace(/<RS>/g, '\n')
      .replace(/<CR>/g, '');

    const lines = cleanData.split('\n');

    const fieldMap: any = {
      DAQ: 'Customer ID (License Number)',
      DCS: 'Last Name',
      DAC: 'First Name',
      DAD: 'Middle Name',
      DBD: 'Issue Date',
      DBB: 'Date of Birth',
      DBA: 'Expiration Date',
      DBC: 'Gender',
      DAU: 'Height',
      DAY: 'Eye Color',
      DAG: 'Street Address',
      DAI: 'City',
      DAJ: 'State',
      DAK: 'Postal Code',
      DCF: 'Document Discriminator',
      DCG: 'Country',
      ZGZ: 'Jurisdiction-Specific 1',
      ZGB: 'Jurisdiction-Specific 2',
      ZGD: 'County',
      ZGE: 'Jurisdiction-Specific 3',
      ZGG: 'Jurisdiction-Specific 4',
      ZGI: 'Street Address (Repeated)',
      ZGJ: 'City (Repeated)',
      ZGK: 'State (Repeated)',
      ZGL: 'Postal Code (Repeated)',
    };

    for (const line of lines) {
      const code = line.slice(0, 3);
      const value = line.slice(3).trim();

      if (fieldMap[code]) {
        parsedData[fieldMap[code]] = value;
      }
    }

    return parsedData;
  }
}
