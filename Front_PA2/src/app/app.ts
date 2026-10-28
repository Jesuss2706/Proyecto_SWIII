import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/navbar/navbar.component';
import { FooterComponent } from './shared/footer/footer.component';
import { AuthService } from './core/services/auth.service';


import { ChatbotComponent } from './shared/chatbot/chatbot.component'; 
import { WhatsappButtonComponent } from './shared/whatsapp-button/whatsapp-button.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavbarComponent, FooterComponent, ChatbotComponent, WhatsappButtonComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected auth = inject(AuthService);
}
