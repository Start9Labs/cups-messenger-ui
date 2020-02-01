import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { ContactChatPage } from './contact-chat.page';

describe('ContactChatPage', () => {
  let component: ContactChatPage;
  let fixture: ComponentFixture<ContactChatPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ContactChatPage ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(ContactChatPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
