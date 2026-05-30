import { Controller, Get, Param } from '@nestjs/common';
import { InvitesService } from '../schools/invites.service';

@Controller('invites')
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @Get(':token')
  preview(@Param('token') token: string) {
    return this.invitesService.getInvitePreview(token);
  }
}
