import { Component } from '@angular/core';

const WHATSAPP_NUMBER = '573126069041'; 
const WHATSAPP_MESSAGE = 'Hola, me gustaría recibir información para poder agendar una cita medica.';

@Component({
  selector: 'app-whatsapp-button',
  templateUrl: './whatsapp-button.component.html',
  styleUrl: './whatsapp-button.component.css',
})
export class WhatsappButtonComponent {
  protected readonly url =
    `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
}