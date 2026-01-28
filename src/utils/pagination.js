const getPagination = (page = 1, limit = 10) => {
  const currentPage = parseInt(page) || 1;
  const itemsPerPage = parseInt(limit) || 10;
  const skip = (currentPage - 1) * itemsPerPage;

  return {
    skip,
    limit: itemsPerPage
  };
};

module.exports = getPagination;
