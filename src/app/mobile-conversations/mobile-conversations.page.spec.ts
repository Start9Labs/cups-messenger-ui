import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { MobileConversationsPage } from './mobile-conversations.page';

describe('MobileConversationsPage', () => {
  let component: MobileConversationsPage;
  let fixture: ComponentFixture<MobileConversationsPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MobileConversationsPage ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(MobileConversationsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
