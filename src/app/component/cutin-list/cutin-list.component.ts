import { Component, NgZone, OnDestroy, OnInit,HostListener,ComponentFactoryResolver, Input } from '@angular/core';
import { EventSystem } from '@udonarium/core/system';
import { ModalService } from 'service/modal.service';
import { PanelService } from 'service/panel.service';
import { TabletopService } from 'service/tabletop.service';
import { ContextMenuService, ContextMenuAction } from 'service/context-menu.service';
import { PointerDeviceService } from 'service/pointer-device.service';
import { Cutin } from '@udonarium/cutin';
import { CutinView } from '@udonarium/cutin-view';
import { CutinViewComponent } from "component/cutin-view/cutin-view.component";
import { OverviewPanelComponent } from 'component/overview-panel/overview-panel.component';

import { AudioFile } from '@udonarium/core/file-storage/audio-file';
import { AudioPlayer, VolumeType } from '@udonarium/core/file-storage/audio-player';
import { AudioStorage } from '@udonarium/core/file-storage/audio-storage';
import { PresetSound, SoundEffect } from '@udonarium/sound-effect';
import { FileArchiver } from '@udonarium/core/file-storage/file-archiver';
import { ObjectStore } from '@udonarium/core/synchronize-object/object-store';
import { FileSelecterComponent } from 'component/file-selecter/file-selecter.component';
import { ImageFile } from '@udonarium/core/file-storage/image-file';
import { ImageStorage } from '@udonarium/core/file-storage/image-storage';


import { PeerCursorComponent } from 'component/peer-cursor/peer-cursor.component';

@Component({
  selector: 'cutin-list',
  templateUrl: './cutin-list.component.html',
  styleUrls: ['./cutin-list.component.css'],
})
export class CutinListComponent implements OnInit, OnDestroy {

  @Input() cutin: CutinView = null;
  get cutins(): Cutin[] {return this.tabletopService.cutins;}
  get imageFile(): ImageFile { return this.cutin.imageFile; }
  get getSoundEffectCutin(): AudioFile { return this.soundEffectCutin; }

  get audios(): AudioFile[] { return AudioStorage.instance.audios.filter(audio => !audio.isHidden); }
  get soundEffect(): SoundEffect { return ObjectStore.instance.get<SoundEffect>('SoundEffect'); }

  readonly sfxPlayer: AudioPlayer = new AudioPlayer();
  private lazyUpdateTimer: NodeJS.Timer = null;
  private soundEffectCutin: AudioFile;
  // = AudioStorage.instance.add('./assets/sounds/tm2/tm2_pon002.wav').identifier;

  constructor(
    private panelService: PanelService,
    private modalService: ModalService,
    private tabletopService: TabletopService,
    private contextMenuService: ContextMenuService,
    private pointerDeviceService: PointerDeviceService,
    private componentFactoryResolver: ComponentFactoryResolver,
    private ngZone: NgZone,
  ) { }

  ngOnInit() {
    Promise.resolve().then(() => this.changeTitle());

    if (!this.soundEffectCutin){
    this.soundEffectCutin = AudioStorage.instance.get(PresetSound.blockPick);
    }
    this.sfxPlayer.volumeType = VolumeType.SOUND_EFFECT;
    EventSystem.register(this)
      .on('*', event => {
        if (event.eventName.startsWith('FILE_')) this.lazyNgZoneUpdate();
      });

  }

  private changeTitle() {
    this.modalService.title = this.panelService.title = 'カットイン一覧';
  }

  ngOnDestroy() {
    EventSystem.unregister(this);
  }

  setSoundEffect(audio: AudioFile) {
    this.soundEffectCutin = audio;
//    this.soundEffectCutin = AudioStorage.instance.add(audio).identifier;
  }

  @HostListener("document:keydown", ["$event"])
  onKeydown(e: KeyboardEvent) {
    if (document.body !== document.activeElement) return;

    if (e.key === 'Escape') {
      this.modalService.resolve();
      return;
    }
  }
  open(cutin:Cutin) {
    if (!this.soundEffectCutin){
      let event = AudioStorage.instance.add(PresetSound.blockPick).identifier;
      SoundEffect.play(event);
      const cutinComponent = CutinView.create(cutin);

      return;
    }
    let event = AudioStorage.instance.add(this.soundEffectCutin).identifier;
    SoundEffect.play(event);
    const cutinComponent = CutinView.create(cutin);
  }

  handleFileSelect(event: Event) {
    let files = (<HTMLInputElement>event.target).files;
    if (files.length) FileArchiver.instance.load(files);
  }

  private lazyNgZoneUpdate() {
    if (this.lazyUpdateTimer !== null) return;
    this.lazyUpdateTimer = setTimeout(() => {
      this.lazyUpdateTimer = null;
      this.ngZone.run(() => { });
    }, 100);
  }
  openModal(name: string = '', isAllowedEmpty: boolean = false) {
    this.modalService.open<string>(FileSelecterComponent, { isAllowedEmpty: isAllowedEmpty }).then(value => {
      Cutin.create(value,value, '', 433, 270, 0, `sampleCutin_${value}`);
      if (!this.cutin || !this.cutin.imageDataElement || !value) return;
      let element = this.cutin.imageDataElement.getFirstElementByName(name);
      if (!element) return;
      element.value = value;

    });
  }
}
