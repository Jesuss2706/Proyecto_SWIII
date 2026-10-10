import { Component, ElementRef, effect, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { FAQS, Faq, FaqLink, WELCOME_MESSAGE } from './faq.data';

interface ChatMessage {
  from: 'bot' | 'user';
  text: string;
  link?: FaqLink;
}

// menu 
@Component({
  selector: 'app-chatbot',
  imports: [RouterLink],
  templateUrl: './chatbot.component.html',
  styleUrl: './chatbot.component.css',
})
export class ChatbotComponent {
  protected readonly auth = inject(AuthService);
  protected readonly faqs = FAQS;
  protected readonly open = signal(false);
  protected readonly typing = signal(false);
  protected readonly messages = signal<ChatMessage[]>([{ from: 'bot', text: WELCOME_MESSAGE }]);

  private readonly body = viewChild<ElementRef<HTMLElement>>('body');

  constructor() {
    effect(() => {
      this.messages();
      this.open();
      setTimeout(() => this.scrollToLastMessage());
    });
  }

  //Desplaza el panel al inicio del ultimo mensaje
  private scrollToLastMessage() {
    const body = this.body()?.nativeElement;
    if (!body) return;

    const items = body.querySelectorAll<HTMLElement>('.pa-msg:not(.pa-typing)');
    const last = items[items.length - 1];
    if (!last) return;

    const top =
      last.getBoundingClientRect().top - body.getBoundingClientRect().top + body.scrollTop - 12;
    body.scrollTo({ top: Math.max(top, 0), behavior: 'smooth' });
  }

  toggle() {
    this.open.update((v) => !v);
  }

  ask(faq: Faq) {
    if (this.typing()) return;
    this.messages.update((m) => [...m, { from: 'user', text: faq.question }]);
    this.typing.set(true);
    // pausa 
    setTimeout(() => {
      this.messages.update((m) => [...m, { from: 'bot', text: faq.answer, link: faq.link }]);
      this.typing.set(false);
    }, 500);
  }

  reset() {
    this.typing.set(false);
    this.messages.set([{ from: 'bot', text: WELCOME_MESSAGE }]);
  }
}