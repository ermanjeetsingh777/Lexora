import { LibraryScope, BookListItem, BookStats, BookStockStatus } from '@core/models/book.models';
import {
  BranchDropdownResponse,
  InstitutionDropdownResponse,
  LibraryDropdownResponse,
} from '@core/models/institution-dropdown.model';

export interface ResolvedLibraryScope {
  scope: LibraryScope;
  institutionName: string;
  branchName: string;
  libraryName: string;
}

export interface MappedLibraryScope extends ResolvedLibraryScope {}

export interface ScopedBookListItem extends BookListItem {
  institutionId: string;
  branchId: string;
  libraryId: string;
  institutionName: string;
  branchName: string;
  libraryName: string;
}

export function listMappedLibraries(
  institutions: InstitutionDropdownResponse[],
): MappedLibraryScope[] {
  const mapped: MappedLibraryScope[] = [];

  for (const institution of institutions) {
    for (const branch of institution.branches ?? []) {
      for (const library of branch.libraries ?? []) {
        mapped.push({
          scope: {
            institutionId: institution.value,
            branchId: branch.value,
            libraryId: library.value,
          },
          institutionName: institution.key,
          branchName: branch.key,
          libraryName: library.key,
        });
      }
    }
  }

  return mapped;
}

export function computeBookStats(books: BookListItem[]): BookStats {
  const categoryMap = new Map<string, number>();

  for (const book of books) {
    categoryMap.set(book.category, (categoryMap.get(book.category) ?? 0) + book.totalCopies);
  }

  return {
    titleCount: books.length,
    totalCopies: books.reduce((sum, book) => sum + book.totalCopies, 0),
    availableCopies: books.reduce((sum, book) => sum + book.availableCopies, 0),
    onLoanCount: books.reduce((sum, book) => sum + book.onLoanCount, 0),
    overdueCount: books.reduce((sum, book) => sum + book.overdueCount, 0),
    lowStockCount: books.filter(book => book.status === BookStockStatus.LowStock).length,
    outOfStockCount: books.filter(book => book.status === BookStockStatus.OutOfStock).length,
    categories: Array.from(categoryMap.entries())
      .map(([category, copies]) => ({ category, copies }))
      .sort((a, b) => a.category.localeCompare(b.category)),
  };
}

export function resolveDefaultLibraryScope(
  institutions: InstitutionDropdownResponse[],
): ResolvedLibraryScope | null {
  const institution = institutions[0];
  if (!institution) return null;

  const branch = institution.branches?.[0];
  if (!branch) return null;

  const library = branch.libraries?.[0];
  if (!library) return null;

  return {
    scope: {
      institutionId: institution.value,
      branchId: branch.value,
      libraryId: library.value,
    },
    institutionName: institution.key,
    branchName: branch.key,
    libraryName: library.key,
  };
}

export function branchesForInstitution(
  institutions: InstitutionDropdownResponse[],
  institutionId: string,
): BranchDropdownResponse[] {
  return institutions.find(i => i.value === institutionId)?.branches ?? [];
}

export function librariesForBranch(
  institutions: InstitutionDropdownResponse[],
  institutionId: string,
  branchId: string,
): LibraryDropdownResponse[] {
  return branchesForInstitution(institutions, institutionId)
    .find(b => b.value === branchId)?.libraries ?? [];
}

export function libraryScopeLabels(
  institutions: InstitutionDropdownResponse[],
  scope: LibraryScope,
): { institutionName: string; branchName: string; libraryName: string } {
  const institution = institutions.find(i => i.value === scope.institutionId);
  const branch = institution?.branches?.find(b => b.value === scope.branchId);
  const library = branch?.libraries?.find(l => l.value === scope.libraryId);

  return {
    institutionName: institution?.key ?? '',
    branchName: branch?.key ?? '',
    libraryName: library?.key ?? '',
  };
}
