using Microsoft.EntityFrameworkCore;
using SLMS_API.Application.Contracts.Common;

namespace SLMS_API.Extensions
{
    public static class PaginationExtensions
    {
        public static async Task<PagedResult<T>> ToPagedResultAsync<T>(
            this IQueryable<T> query,
            int pageNumber,
            int pageSize,
            CancellationToken cancellationToken = default)
        {
            var totalCount = await EntityFrameworkQueryableExtensions.CountAsync(
                query,
                cancellationToken);

            var items = await EntityFrameworkQueryableExtensions.ToListAsync(
                query
                    .Skip((pageNumber - 1) * pageSize)
                    .Take(pageSize),
                cancellationToken);            

            return new PagedResult<T>(
                items,
                totalCount,
                pageNumber,
                pageSize);
        }
    }
}
