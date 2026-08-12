import { Component } from '@angular/core';
import { BranchCreate } from "@features/branches/branch-create/branch-create";

@Component({
  selector: 'app-on-boarding-branch',
  imports: [BranchCreate],
  templateUrl: './on-boarding-branch.html',
  styleUrl: './on-boarding-branch.css',
})
export class OnBoardingBranch {}
