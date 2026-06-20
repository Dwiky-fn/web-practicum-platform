exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumn('submission_reviews', {
    feedback_details: {
      type: 'JSONB',
      default: '[]',
    },
  });
};

exports.down = (pgm) => {
  pgm.dropColumn('submission_reviews', 'feedback_details');
};
