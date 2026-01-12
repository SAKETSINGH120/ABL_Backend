const VariantType = require('../../../models/variantType');
const catchAsync = require('../../../utils/catchAsync');

// Create variant type
exports.createVariantType = catchAsync(async (req, res, next) => {
  try {
    const { name, category, status } = req.body;

    const existingVariantType = await VariantType.findOne({ name, isDeleted: false });
    if (existingVariantType) {
      return res.status(400).json({
        success: false,
        message: 'Variant type with this name already exists'
      });
    }

    const variantType = await VariantType.create({
      name,
      category: category || 'other',
      status: status || 'active'
    });

    return res.status(201).json({
      success: true,
      message: 'Variant type created successfully',
      data: variantType
    });
  } catch (error) {
    console.error('Error in create variant type:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get all variant types
exports.getAllVariantTypes = catchAsync(async (req, res, next) => {
  try {
    const { status, category, search } = req.query;

    const query = { isDeleted: false };

    if (status) {
      query.status = status;
    }

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$or = [{ name: { $regex: search, $options: 'i' } }];
    }

    const variantTypes = await VariantType.find(query).sort({ category: 1, name: 1 });

    return res.status(200).json({
      success: true,
      message: 'Variant types retrieved successfully',
      data: variantTypes
    });
  } catch (error) {
    console.error('Error in get all variant types:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get variant type by ID
exports.getVariantTypeById = catchAsync(async (req, res, next) => {
  try {
    const { id } = req.params;

    const variantType = await VariantType.findOne({ _id: id, isDeleted: false });

    if (!variantType) {
      return res.status(404).json({
        success: false,
        message: 'Variant type not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Variant type retrieved successfully',
      data: variantType
    });
  } catch (error) {
    console.error('Error in get variant type by id:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Update variant type
exports.updateVariantType = catchAsync(async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, category, status } = req.body;

    const variantType = await VariantType.findOne({ _id: id, isDeleted: false });

    if (!variantType) {
      return res.status(404).json({
        success: false,
        message: 'Variant type not found'
      });
    }

    if (name && name !== variantType.name) {
      const existingVariantType = await VariantType.findOne({
        name,
        isDeleted: false,
        _id: { $ne: id }
      });

      if (existingVariantType) {
        return res.status(400).json({
          success: false,
          message: 'Variant type with this name already exists'
        });
      }
    }

    if (name) variantType.name = name;
    if (category) variantType.category = category;
    if (status) variantType.status = status;

    await variantType.save();

    return res.status(200).json({
      success: true,
      message: 'Variant type updated successfully',
      data: variantType
    });
  } catch (error) {
    console.error('Error in update variant type:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Delete variant type (soft delete)
exports.deleteVariantType = catchAsync(async (req, res, next) => {
  try {
    const { id } = req.params;

    const variantType = await VariantType.findOne({ _id: id, isDeleted: false });

    if (!variantType) {
      return res.status(404).json({
        success: false,
        message: 'Variant type not found'
      });
    }

    variantType.isDeleted = true;
    await variantType.save();

    return res.status(200).json({
      success: true,
      message: 'Variant type deleted successfully'
    });
  } catch (error) {
    console.error('Error in delete variant type:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});
