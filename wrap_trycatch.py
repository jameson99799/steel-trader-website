import io

def wrap_run_with_try_catch(filepath):
    try:
        with io.open(filepath, 'r', encoding='utf-8') as f:
            text = f.read()
    except Exception as e:
        print(f"Skipping {filepath}: {e}")
        return

    # For PUT
    put_target = "    run(\n"
    if put_target in text:
        put_replacement = """    try {
      run(
"""
        text = text.replace("    run(\n        `UPDATE", "    try {\n      run(\n        `UPDATE")
        text = text.replace("resolvedCatId, id]\n    )\n    res.json({ message: '更新成功'", "resolvedCatId, id]\n      )\n      res.json({ message: '更新成功'")
        
        # Now we need to add the catch block
        catch_block = """
    } catch (err) {
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: '保存失败：自定义链接(Slug)或标题已经被其他文章使用，请修改后重试！' })
      }
      return res.status(500).json({ error: '服务器内部错误：' + err.message })
    }
"""
        text = text.replace("category_id: resolvedCatId })\n})", "category_id: resolvedCatId })\n" + catch_block + "})")

    with io.open(filepath, 'w', encoding='utf-8') as f:
        f.write(text)
    print(f"Updated {filepath} with try/catch.")

wrap_run_with_try_catch('server/routes/news.js')
